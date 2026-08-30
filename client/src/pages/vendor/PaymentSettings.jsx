import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSelector } from 'react-redux';

const PaymentSettings = () => {
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    upi_id: '',
    bank_account: '',
    ifsc_code: '',
    account_holder_name: '',
    bank_name: '',
    branch_location: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/vendor/dashboard');
        if (res.data.profile) {
          setProfile(res.data.profile);
          setSettingsForm({
            upi_id: res.data.profile.upi_id || '',
            bank_account: res.data.profile.bank_account || '',
            ifsc_code: res.data.profile.ifsc_code || '',
            account_holder_name: res.data.profile.account_holder_name || '',
            bank_name: res.data.profile.bank_name || '',
            branch_location: res.data.profile.branch_location || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  const submitSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/vendor/business-profile', { ...profile, ...settingsForm });
      alert('Payment settings saved successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save settings');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading settings...</div>;

  return (
    <div className="bg-white p-8 rounded-[12px] shadow-sm border border-gray-100 animate-fade-in max-w-2xl">
      <h2 className="text-2xl font-bold text-primary mb-6">Payment Collection Settings</h2>
      <p className="text-gray-500 mb-6">Add your UPI ID and Bank Account details below to receive payouts for your sales.</p>
      
      <form onSubmit={submitSettings} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">UPI ID</label>
          <input 
            type="text" 
            name="upi_id" 
            value={settingsForm.upi_id} 
            onChange={handleSettingsChange} 
            placeholder="example@upi" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Account Holder Name (As per Passbook)</label>
          <input 
            type="text" 
            name="account_holder_name" 
            value={settingsForm.account_holder_name} 
            onChange={handleSettingsChange} 
            placeholder="Full Name on Passbook" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bank Name</label>
          <input 
            type="text" 
            name="bank_name" 
            value={settingsForm.bank_name} 
            onChange={handleSettingsChange} 
            placeholder="e.g. State Bank of India" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Branch Location</label>
          <input 
            type="text" 
            name="branch_location" 
            value={settingsForm.branch_location} 
            onChange={handleSettingsChange} 
            placeholder="Branch City/Area" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bank Account Number</label>
          <input 
            type="text" 
            name="bank_account" 
            value={settingsForm.bank_account} 
            onChange={handleSettingsChange} 
            placeholder="Account Number" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">IFSC Code</label>
          <input 
            type="text" 
            name="ifsc_code" 
            value={settingsForm.ifsc_code} 
            onChange={handleSettingsChange} 
            placeholder="IFSC Code" 
            className="w-full border border-gray-300 rounded-[8px] p-3 text-sm focus:border-primary focus:outline-none" 
          />
        </div>
        
        <div className="flex justify-end pt-4">
           <button type="submit" className="bg-primary text-white font-bold py-3 px-8 rounded-[8px] hover:opacity-90 transition-opacity">
             Save Payment Settings
           </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettings;
