import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const SubscriptionManagement = () => {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // TODO: Connect to actual /api/admin/subscriptions endpoint
      console.log('Submitting plan', data);
      alert('Subscription Plan created successfully!');
      reset();
    } catch (err) {
      alert('Error creating plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-6">Create Subscription Plan</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
            <input {...register('name')} className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" placeholder="e.g. Premium" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select {...register('tier')} className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none">
              <option value="BASIC">BASIC</option>
              <option value="SILVER">SILVER</option>
              <option value="GOLD">GOLD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price (₹)</label>
            <input {...register('yearly_price')} type="number" className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" placeholder="10000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
            <input {...register('monthly_price')} type="number" className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" placeholder="1000" />
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mt-6 border-b pb-2">Dynamic Limits</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Free Business Limit (₹)</label>
            <input {...register('free_business_limit')} type="number" className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" placeholder="1000000" />
            <p className="text-xs text-gray-500 mt-1">Total revenue allowed before service charge.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (%)</label>
            <input {...register('service_charge_percentage')} type="number" step="0.01" className="w-full border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" placeholder="5" />
            <p className="text-xs text-gray-500 mt-1">Percentage charged on excess revenue.</p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded mt-6 hover:opacity-90">
          {loading ? 'Creating...' : 'Create Plan'}
        </button>
      </form>
    </div>
  );
};

export default SubscriptionManagement;
