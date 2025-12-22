/**
 * Admin Pricing Page
 * Отображает текущие цены токенов (LAIKA)
 * Автоматически обновляется каждые 30 минут
 */

import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/admin.api';

interface LaikaPricing {
  currentPrice: number;
  platformAcceptanceValue: number;
  platformDiscount: number;
  sources: string[];
  cacheAge: string;
  updatedAt: string;
}

export default function AdminPricingPage() {
  const [laikaPricing, setLaikaPricing] = useState<LaikaPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchLaikaPrice = async () => {
    try {
      setLoading(true);
      const response = await adminApiService.getLaikaPricing();
      setLaikaPricing(response.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch LAIKA price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaikaPrice();

    // Auto-refresh every 5 minutes (backend updates every 30 min)
    const interval = setInterval(() => {
      fetchLaikaPrice();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Pricing</h1>
          <p className="text-neutral-400 mt-1">Live token prices with automatic updates</p>
        </div>
        <button
          onClick={fetchLaikaPrice}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
        >
          {loading ? 'Updating...' : 'Refresh Prices'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* LAIKA Price Card */}
      <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">LAIKA Token</h2>
            <p className="text-sm text-neutral-400 mt-1">The Soldog - Boost Token</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500">Last Updated</div>
            <div className="text-sm text-neutral-300">
              {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {loading && !laikaPricing ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-400 mt-2">Loading price data...</p>
          </div>
        ) : laikaPricing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Market Price */}
            <div className="bg-neutral-900/50 rounded-lg p-4">
              <div className="text-xs text-neutral-500 mb-1">Market Price</div>
              <div className="text-2xl font-bold text-emerald-400">
                ${laikaPricing.currentPrice.toFixed(6)}
              </div>
              <div className="text-xs text-neutral-400 mt-2">per LAIKA</div>
            </div>

            {/* Platform Value */}
            <div className="bg-neutral-900/50 rounded-lg p-4">
              <div className="text-xs text-neutral-500 mb-1">Platform Acceptance Value</div>
              <div className="text-2xl font-bold text-yellow-400">
                ${laikaPricing.platformAcceptanceValue.toFixed(6)}
              </div>
              <div className="text-xs text-neutral-400 mt-2">
                {laikaPricing.platformDiscount}% below market
              </div>
            </div>

            {/* Data Sources */}
            <div className="bg-neutral-900/50 rounded-lg p-4">
              <div className="text-xs text-neutral-500 mb-2">Price Sources</div>
              <div className="flex flex-wrap gap-2">
                {laikaPricing.sources.map((source, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded"
                  >
                    {source}
                  </span>
                ))}
              </div>
              <div className="text-xs text-neutral-400 mt-3">
                Cache: {laikaPricing.cacheAge}
              </div>
            </div>

            {/* Update Info */}
            <div className="bg-neutral-900/50 rounded-lg p-4">
              <div className="text-xs text-neutral-500 mb-2">Auto-Update</div>
              <div className="text-sm text-neutral-300">
                Backend: Every 30 min
              </div>
              <div className="text-sm text-neutral-300 mt-1">
                Dashboard: Every 5 min
              </div>
              <div className="mt-3">
                <div className="text-xs text-neutral-500">Backend Updated</div>
                <div className="text-xs text-neutral-400">
                  {new Date(laikaPricing.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Price Calculation Info */}
        {laikaPricing && (
          <div className="mt-6 pt-6 border-t border-neutral-700">
            <h3 className="text-sm font-semibold text-white mb-3">How Platform Values LAIKA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-neutral-900/30 rounded p-3">
                <div className="text-neutral-400 mb-1">Market Price:</div>
                <div className="text-white font-mono">${laikaPricing.currentPrice.toFixed(6)}</div>
              </div>
              <div className="bg-neutral-900/30 rounded p-3">
                <div className="text-neutral-400 mb-1">Platform Multiplier:</div>
                <div className="text-white font-mono">0.90 (10% discount)</div>
              </div>
              <div className="bg-neutral-900/30 rounded p-3">
                <div className="text-neutral-400 mb-1">Platform Value:</div>
                <div className="text-emerald-400 font-mono">
                  ${laikaPricing.platformAcceptanceValue.toFixed(6)}
                </div>
              </div>
              <div className="bg-neutral-900/30 rounded p-3">
                <div className="text-neutral-400 mb-1">Example (1000 LAIKA):</div>
                <div className="text-white font-mono">
                  ${(laikaPricing.platformAcceptanceValue * 1000).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Price Update Information</h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Backend automatically updates prices every 30 minutes</li>
          <li>• Prices are fetched from CoinMarketCap, Jupiter, and CoinGecko</li>
          <li>• Platform accepts LAIKA at 10% below market price</li>
          <li>• Cached prices are valid for 5 minutes</li>
        </ul>
      </div>
    </div>
  );
}
