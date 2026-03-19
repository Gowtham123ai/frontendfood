import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import Table from '../components/Table';
import toast from 'react-hot-toast';

export default function UsersPage({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    return () => unsub();
  }, [userRole]);

  const toggleBlock = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { blocked: !current });
      toast.success(current ? 'User unblocked' : 'User blocked');
    } catch(e) {
      toast.error('Failed to update user');
    }
  };

  const assignRole = async (uid: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      toast.success(`Role updated to ${role}`);
    } catch(e) {
      toast.error('Failed to update role');
    }
  };

  const columns = [
    { key: 'name', header: 'Name', render: (u: UserProfile) => <span className="font-bold text-white">{u.name || 'Anonymous User'}</span> },
    { key: 'email', header: 'Email', render: (u: UserProfile) => <span className="text-slate-400 text-sm">{u.email || u.phone}</span> },
    { key: 'role', header: 'Role', render: (u: UserProfile) => (
      <select 
        value={u.role} 
        onChange={e => assignRole(u.uid, e.target.value)}
        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-2 py-1 outline-none focus:border-orange-500 cursor-pointer"
      >
        <option value="user">User</option>
        <option value="manager">Manager</option>
        <option value="delivery_person">Delivery</option>
        <option value="admin">Admin</option>
      </select>
    ) },
    { key: 'status', header: 'Status', render: (u: UserProfile) => (
      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${u.blocked ? 'text-red-500 border-red-500/20 bg-red-500/10' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'}`}>
        {u.blocked ? 'BLOCKED' : 'ACTIVE'}
      </span>
    ) },
    { key: 'actions', header: 'Action', render: (u: UserProfile) => (
      u.role !== 'admin' ? (
        <button 
          onClick={() => toggleBlock(u.uid, !!u.blocked)} 
          className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
             u.blocked ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white'
          }`}
        >
          {u.blocked ? 'UNBLOCK' : 'BLOCK'}
        </button>
      ) : <span className="text-slate-500 text-xs italic">Protected</span>
    ) }
  ];

  return (
    <div className="space-y-6">
       <Table data={users} columns={columns} keyExtractor={u=>u.uid} />
    </div>
  );
}
