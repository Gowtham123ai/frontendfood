import React, { useState } from 'react';
import { auth } from '../firebase';
import { MenuItem, UserProfile } from '../types';
import { motion } from 'framer-motion';
import { Search, Filter, Star, Plus, MessageSquare, Send, X, Languages, Sparkles, Mic } from 'lucide-react';
import { getFoodSuggestions, getAIRecommendations } from '../services/geminiService';
import MenuCard from '../components/MenuCard';
import toast from 'react-hot-toast';

interface MenuViewProps {
  menu: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  language: 'en' | 'ta';
  setLanguage: (lang: 'en' | 'ta') => void;
  user: UserProfile | null;
}

export default function MenuView({ menu, onAddToCart, language, setLanguage, user }: MenuViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [recommendedItems, setRecommendedItems] = useState<MenuItem[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  React.useEffect(() => {
    async function fetchRecs() {
      if (!menu.length) return;
      setRecsLoading(true);
      try {
        const itemIds = await getAIRecommendations(menu, user?.preferences || '');
        const recs = menu.filter(m => itemIds.includes(m.id)).slice(0, 4);
        if (recs.length === 0) {
          throw new Error('No recs found');
        }
        setRecommendedItems(recs);
      } catch (err) {
        // Fallback
        setRecommendedItems(menu.sort((a,b) => b.rating - a.rating).slice(0, 4));
      } finally {
        setRecsLoading(false);
      }
    }
    fetchRecs();
  }, [menu, user]);

  const categories = ['All', 'Veg', 'Non-Veg', 'Drinks'];

  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    const avail = item.isAvailable;
    const matchesAvailability = avail === true || String(avail) === 'true' || avail === undefined;
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const aiResponse = await getFoodSuggestions(userMsg, menu);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse || 'Sorry, I couldn\'t help with that.' }]);
    } catch (error) {
      toast.error('Chatbot error');
    } finally {
      setChatLoading(false);
    }
  };

  const startVoiceOrdering = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice ordering not supported in your browser.');
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = language === 'en' ? 'en-US' : 'ta-IN';
    recognition.start();
    
    toast.loading('Speak your order now... 🎙️', { id: 'voice' });

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      toast.dismiss('voice');
      
      const foundItem = menu.find(m => text.includes(m.name.toLowerCase()));
      if (foundItem) {
        if (foundItem.stock !== undefined && foundItem.stock <= 0) {
           toast.error(`Sorry, ${foundItem.name} is Out of Stock! ❌`);
        } else {
           onAddToCart(foundItem);
           toast.success(`Heard "${text}". Added ${foundItem.name} nicely! 🎙️`);
        }
      } else {
        setSearch(text);
        toast(`Heard "${text}". Showing matches.`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow it in your browser settings.', { id: 'voice', duration: 4000 });
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try again or speak louder.', { id: 'voice', duration: 4000 });
      } else if (event.error === 'network') {
        toast.error('Network error occurred during speech recognition.', { id: 'voice' });
      } else {
        toast.error(`Could not hear you properly (${event.error}). Try again.`, { id: 'voice' });
      }
      recognition.stop();
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Debug Indicator removed */}

      {/* Hero Section */}
      <div className="relative h-[350px] rounded-[2rem] overflow-hidden group shadow-2xl shadow-black/50">
        <img
          src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=2070"
          alt="Hero"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-8 sm:px-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-tight"
          >
            {language === 'en' ? 'DELICIOUSLY' : 'சுவையான'} <br />
            <span className="text-orange-500">{language === 'en' ? 'DELIVERED' : 'உணவு விநியோகம் 🍛'}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 mt-6 text-xl max-w-lg font-bold leading-relaxed opacity-90"
          >
            {language === 'en' ? 'Experience the peak of cloud kitchen excellence at your doorstep.' : 'உங்கள் வீட்டுக்கு நேரடியாக சூடான மற்றும் சுவையான தமிழ் உணவுகள்! 🛵🔥'}
          </motion.p>
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => document.getElementById('menu-grid')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-orange-600/30 active:scale-95"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="sticky top-20 z-40 py-4 bg-[#0b1120]/80 backdrop-blur-xl border-b border-slate-800/50 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder={language === 'en' ? "Search for dishes..." : "உணவுகளைத் தேடுங்கள்..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-14 py-4 bg-[#1e293b] border border-slate-800 text-white rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
              />
              <button 
                onClick={startVoiceOrdering}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-md active:scale-95"
                title="Speak to Order"
              >
                <Mic size={16} />
              </button>
            </div>
            <button
              onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
              className="p-4 bg-[#1e293b] border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-3 text-sm font-bold text-white shadow-lg"
            >
              <Languages size={20} className="text-orange-500" />
              <span className="hidden sm:inline">{language === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap shadow-lg ${category === cat
                    ? 'bg-orange-600 text-white scale-105 shadow-orange-600/20'
                    : 'bg-[#1e293b] text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured AI Recommendations */}
      {search === '' && category === 'All' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {language === 'en' ? 'Recommended for you' : 'உங்களுக்காக பரிந்துரைக்கப்படுகிறது'}
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">True AI Based suggestions ✨</p>
            </div>
          </div>
          {recsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-64 bg-slate-800/50 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedItems.map((item) => (
                <MenuCard
                  key={`rec-${item.id}`}
                  item={item}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
          <div className="h-px bg-slate-800/50 w-full" />
        </div>
      )}

      {/* Menu Grid */}
      <div id="menu-grid" className="space-y-6">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
          {category === 'All' ? (language === 'en' ? 'Our Full Menu' : 'முழு மெனு') : category}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMenu.map((item, idx) => (
            <MenuCard
              key={item.id}
              item={item}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>

      {filteredMenu.length === 0 && (
        <div className="text-center py-24 bg-[#1e293b] rounded-[3rem] border border-slate-800 border-dashed">
          <Search size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white">No dishes found</h3>
          <p className="text-slate-500 mt-2">Try searching for something else or change category</p>
        </div>
      )}

      {/* Chatbot Toggle */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 left-8 bg-stone-900 text-white p-4 rounded-2xl shadow-xl hover:bg-stone-800 transition-all z-40 flex items-center gap-3"
      >
        <MessageSquare size={24} />
        <span className="font-bold hidden sm:block">Ask AI</span>
      </button>

      {/* Chatbot Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#111827] w-full max-w-lg h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#111827]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">MAGIZHAMUDHU AI</h3>
                  <p className="text-[10px] text-slate-500 font-medium">என்ன சாப்பிட விரும்புகிறீர்கள்? 🤖</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b1120]">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm italic font-medium">எப்படி உதவ முடியும்? 🥘</p>
                  <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest font-bold">Try: "Suggest something spicy"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-[#ff6b00] text-white rounded-tr-none shadow-lg shadow-orange-500/10' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-800 bg-[#111827]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="சிறு உரையாடல்..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-[#0b1120] border border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 text-white outline-none transition-all placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#ff6b00] text-white rounded-lg hover:bg-orange-600 transition-all shadow-lg"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
