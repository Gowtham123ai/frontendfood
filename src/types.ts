export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'Veg' | 'Non-Veg' | 'Drinks';
  description: string;
  imageUrl: string;
  isAvailable?: boolean;
  rating?: number;
  stock?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'manager';
  phone?: string;
  preferences?: string;
  address?: string;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: string;
  status: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  address: string;
  addressDetails?: Address;
  createdAt: any;
  paymentId?: string;
}