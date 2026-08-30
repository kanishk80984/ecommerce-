import React, { useState, useEffect } from 'react';
import { CreditCard, Save, Landmark } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const UserBankAccounts = () => {
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAccount();
  }, []);

  const fetchMyAccount = async () => {
    try {
      const { data } = await api.get('/bank-accounts/my');
      if (data.success && data.bankAccount) {
        setBankName(data.bankAccount.bank_name);
        setAccountName(data.bankAccount.account_holder_name);
        setAccountNumber(data.bankAccount.account_number);
        setIfscCode(data.bankAccount.ifsc_code);
      }
    } catch (error) {
      console.error('Failed to load personal bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!bankName || !accountName || !accountNumber || !ifscCode) {
      toast.error('All fields are required');
      return;
    }
    
    setIsSaving(true);
    try {
      const { data } = await api.post('/bank-accounts/my', {
        bank_name: bankName,
        account_holder_name: accountName,
        account_number: accountNumber,
        ifsc_code: ifscCode
      });
      if (data.success) {
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-2xl">
      <h3 className="font-semibold text-lg mb-6 text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
        <Landmark className="w-5 h-5 text-gray-500" />
        Bank Account Details
      </h3>
      <p className="text-sm text-gray-500 mb-6">Provide your bank details to receive refunds directly to your account.</p>
      
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Account Holder Name</label>
          <input 
            type="text" 
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary shadow-sm"
            placeholder="Name on account"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Bank Name</label>
          <input 
            type="text" 
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary shadow-sm"
            placeholder="e.g. State Bank of India"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Account Number</label>
          <input 
            type="text" 
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary shadow-sm"
            placeholder="Bank Account Number"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">IFSC Code</label>
          <input 
            type="text" 
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary shadow-sm"
            placeholder="Bank IFSC Code"
          />
        </div>
        
        <button 
          type="submit"
          disabled={isSaving}
          className="w-fit px-8 py-3 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Bank Details'}
        </button>
      </form>
    </div>
  );
};

export default UserBankAccounts;
