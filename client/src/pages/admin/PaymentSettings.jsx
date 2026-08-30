import React, { useState, useEffect } from 'react';
import { CreditCard, Save, Landmark, AlertCircle, Building2, UserCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

const PaymentSettings = () => {
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchMyAccount();
    fetchAllAccounts();
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
    }
  };

  const fetchAllAccounts = async () => {
    try {
      const { data } = await api.get('/bank-accounts');
      if (data.success) {
        setAllAccounts(data.bankAccounts);
      }
    } catch (error) {
      toast.error('Failed to fetch user bank accounts');
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
        fetchAllAccounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VENDOR': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'USER': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Landmark className="text-primary" size={28} />
            Payment & Bank Settings
          </h2>
          <p className="text-gray-500 mt-1">Manage your bank details and view system bank accounts</p>
        </div>
      </div>

      {/* My Bank Details Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 p-6 bg-gray-50 flex items-center gap-2">
          <CreditCard className="text-primary" size={20} />
          <h3 className="font-bold text-gray-800 text-lg">My Bank Details</h3>
        </div>
        <form onSubmit={handleSave} className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Account Holder Name</label>
              <input 
                type="text" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Name on account"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
              <input 
                type="text" 
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
              <input 
                type="text" 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Bank Account Number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">IFSC Code</label>
              <input 
                type="text" 
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Bank IFSC Code"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Bank Details'}
            </button>
          </div>
        </form>
      </div>

      {/* All Bank Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 p-6 bg-gray-50 flex items-center gap-2">
          <Building2 className="text-gray-600" size={20} />
          <h3 className="font-bold text-gray-800 text-lg">System Bank Accounts</h3>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allAccounts.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-100">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium">No bank accounts registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-4 text-sm font-semibold text-gray-600">User Details</th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-600">Role</th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-600">Bank Name</th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-600">Account Details</th>
                  </tr>
                </thead>
                <tbody>
                  {allAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                            <UserCircle size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{account.user_name}</p>
                            <p className="text-xs text-gray-500">{account.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(account.user_role)}`}>
                          {account.user_role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-gray-800">{account.bank_name}</p>
                        <p className="text-xs text-gray-500">{account.account_holder_name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm text-gray-700">
                          <p>A/C: {account.account_number}</p>
                          <p>IFSC: {account.ifsc_code}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
