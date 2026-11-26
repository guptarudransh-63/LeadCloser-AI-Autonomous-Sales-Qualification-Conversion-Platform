import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Package,
  Plus,
  Tag,
  DollarSign,
  Calculator,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import api from '../services/api';

export default function Services() {
  const [services, setServices] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculator State
  const [calcServiceId, setCalcServiceId] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [complexity, setComplexity] = useState('standard');
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    try {
      const [svcRes, rulesRes] = await Promise.all([
        api.get('/services'),
        api.get('/services/rules/all')
      ]);

      if (svcRes.data.success) {
        setServices(svcRes.data.services || []);
        if (svcRes.data.services.length > 0) {
          setCalcServiceId(svcRes.data.services[0]._id);
        }
      }
      if (rulesRes.data.success) setPricingRules(rulesRes.data.rules || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunCalculation = async () => {
    if (!calcServiceId) return;
    setCalculating(true);
    try {
      const res = await api.post('/estimates/calculate', {
        serviceId: calcServiceId,
        selectedPackageName: selectedPackage || null,
        addonCodes: selectedAddons,
        complexityLevel: complexity
      });
      if (res.data.success) {
        setCalcResult(res.data.estimate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (calcServiceId) {
      handleRunCalculation();
    }
  }, [calcServiceId, selectedPackage, selectedAddons, complexity]);

  const toggleAddon = (code) => {
    setSelectedAddons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const currentCalcService = services.find((s) => s._id === calcServiceId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-text-main tracking-tight">Services & Pricing Engine Configuration</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Deterministic business rules, package tiers, and precision pricing constraints
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Services & Catalog Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Package className="w-4 h-4 text-accent-primary" />
              Configured Services ({services.length})
            </h3>

            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc._id}
                  className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-accent-secondary uppercase tracking-wider">
                        {svc.category}
                      </span>
                      <h4 className="font-bold text-sm text-text-main">{svc.name}</h4>
                    </div>
                    <span className="text-sm font-extrabold text-status-success">
                      Base: ₹{(svc.basePricePaise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">{svc.description}</p>

                  {svc.packages && svc.packages.length > 0 && (
                    <div className="pt-2 border-t border-border-dark/60">
                      <span className="text-[10px] font-bold text-text-muted uppercase mb-2 block">
                        Tiered Packages
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {svc.packages.map((pkg, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-bg-elevated border border-border-dark text-xs space-y-1"
                          >
                            <span className="font-bold text-text-main block">{pkg.name}</span>
                            <span className="text-accent-primary font-bold">
                              ₹{(pkg.pricePaise / 100).toLocaleString('en-IN')}
                            </span>
                            <p className="text-[10px] text-text-muted">{pkg.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons and Rules */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Tag className="w-4 h-4 text-accent-secondary" />
              Configured Add-On Pricing Rules ({pricingRules.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pricingRules.map((rule) => (
                <div
                  key={rule._id}
                  className="bg-bg-card border border-border-dark rounded-xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] text-text-muted">{rule.code}</span>
                    <h5 className="font-bold text-xs text-text-main">{rule.name}</h5>
                    <p className="text-[10px] text-text-muted truncate max-w-[180px]">{rule.description}</p>
                  </div>
                  <span className="font-extrabold text-xs text-status-success shrink-0">
                    +₹{(rule.amountPaise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Pricing Calculator Sandbox */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Calculator className="w-4 h-4 text-status-warning" />
            Deterministic Price Calculator
          </h3>

          <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-4 text-xs">
            {/* Service Select */}
            <div>
              <label className="block text-text-muted mb-1 font-semibold">Service</label>
              <select
                value={calcServiceId}
                onChange={(e) => {
                  setCalcServiceId(e.target.value);
                  setSelectedPackage('');
                }}
                className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
              >
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Package Select */}
            {currentCalcService?.packages && currentCalcService.packages.length > 0 && (
              <div>
                <label className="block text-text-muted mb-1 font-semibold">Package Tier (Optional)</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                >
                  <option value="">Base Service Tier</option>
                  {currentCalcService.packages.map((pkg, i) => (
                    <option key={i} value={pkg.name}>
                      {pkg.name} — ₹{(pkg.pricePaise / 100).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Addons Checklist */}
            <div>
              <label className="block text-text-muted mb-2 font-semibold">Add-Ons</label>
              <div className="space-y-2">
                {pricingRules.map((rule) => {
                  const isChecked = selectedAddons.includes(rule.code);
                  return (
                    <label
                      key={rule._id}
                      onClick={() => toggleAddon(rule.code)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-accent-primary/15 border-accent-primary text-text-main'
                          : 'bg-bg-elevated border-border-dark text-text-muted hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-accent-primary border-accent-primary text-bg-main' : 'border-border-dark'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-medium text-[11px]">{rule.name}</span>
                      </div>
                      <span className="font-bold text-[11px]">
                        +₹{(rule.amountPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Complexity Tier */}
            <div>
              <label className="block text-text-muted mb-1.5 font-semibold">Technical Complexity</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['standard', 'medium', 'high'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setComplexity(c)}
                    className={`py-1.5 rounded-lg border text-[11px] font-semibold capitalize transition-all ${
                      complexity === c
                        ? 'bg-accent-secondary/20 border-accent-secondary text-accent-secondary'
                        : 'bg-bg-elevated border-border-dark text-text-muted hover:text-text-main'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Output Card */}
            {calcResult && (
              <div className="pt-3 border-t border-border-dark space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Estimated Output</span>
                <div className="divide-y divide-border-dark/60 text-[11px]">
                  {calcResult.lineItems?.map((li, idx) => (
                    <div key={idx} className="py-1 flex justify-between items-center text-text-muted">
                      <span className="truncate max-w-[150px]">{li.name}</span>
                      <span className="text-text-main font-semibold">
                        ₹{(li.totalPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border-dark flex justify-between items-center text-xs">
                  <span className="font-bold text-text-main">Calculated Total:</span>
                  <span className="text-base font-extrabold text-status-success">{calcResult.formattedTotal}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
