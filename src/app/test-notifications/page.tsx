'use client';

import { useState, useEffect } from 'react';
import { enablePush, disablePush } from '@/lib/push';

export default function TestNotificationsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState('');
  const [swStatus, setSwStatus] = useState('');
  const [permission, setPermission] = useState('');

  useEffect(() => {
    // Intercepter console.log pour afficher dans l'UI
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev, `[${type}] ${new Date().toLocaleTimeString()} - ${message}`]);
    };

    console.log = (...args) => {
      originalLog(...args);
      if (args[0]?.includes?.('[push]')) {
        addLog('LOG', ...args);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      if (args[0]?.includes?.('[push]')) {
        addLog('WARN', ...args);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      if (args[0]?.includes?.('[push]')) {
        addLog('ERROR', ...args);
      }
    };

    // Vérifier l'état initial
    checkStatus();

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const checkStatus = async () => {
    setVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'MISSING');
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'N/A');
    
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setSwStatus(reg ? `Active: ${!!reg.active}` : 'Not registered');
    } else {
      setSwStatus('Not supported');
    }
  };

  const handleEnablePush = async () => {
    setIsLoading(true);
    setLogs([]);
    try {
      const result = await enablePush();
      setLogs(prev => [...prev, `\n✅ RESULT: ${result ? 'SUCCESS' : 'FAILED'}`]);
    } catch (err: any) {
      setLogs(prev => [...prev, `\n❌ EXCEPTION: ${err.message}`]);
    } finally {
      setIsLoading(false);
      await checkStatus();
    }
  };

  const handleDisablePush = async () => {
    setIsLoading(true);
    try {
      const result = await disablePush();
      setLogs(prev => [...prev, `\n🔴 Disable result: ${result}`]);
    } finally {
      setIsLoading(false);
      await checkStatus();
    }
  };

  const handleTestNotification = async () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'Ceci est un test local',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      });
      setLogs(prev => [...prev, '\n📬 Test notification envoyée (local)']);
    } else {
      setLogs(prev => [...prev, '\n⚠️ Permission non accordée']);
    }
  };

  const handleSendPushFromServer = async () => {
    setLogs(prev => [...prev, '\n📤 Envoi d\'une notification depuis le serveur...']);
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
      });
      const data = await res.json();
      setLogs(prev => [...prev, `\n📥 Réponse serveur: ${JSON.stringify(data, null, 2)}`]);
    } catch (err: any) {
      setLogs(prev => [...prev, `\n❌ Erreur: ${err.message}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Test des Notifications PWA</h1>
        
        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm text-gray-600">VAPID Key</h3>
            <p className="text-xs font-mono mt-1 break-all">
              {vapidKey.substring(0, 20)}...
            </p>
            <p className={`text-xs mt-1 ${vapidKey === 'MISSING' ? 'text-red-600' : 'text-green-600'}`}>
              {vapidKey === 'MISSING' ? '❌ Missing' : '✅ Present'}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm text-gray-600">Service Worker</h3>
            <p className="text-xs mt-1">{swStatus}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm text-gray-600">Permission</h3>
            <p className={`text-xs mt-1 font-semibold ${
              permission === 'granted' ? 'text-green-600' : 
              permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {permission.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEnablePush}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              🔔 Enable Push
            </button>
            
            <button
              onClick={handleDisablePush}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              🔕 Disable Push
            </button>
            
            <button
              onClick={handleTestNotification}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📬 Test Local Notification
            </button>
            
            <button
              onClick={handleSendPushFromServer}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              📤 Send Push from Server
            </button>
            
            <button
              onClick={() => setLogs([])}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>

        {/* Logs Display */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow font-mono text-xs overflow-auto max-h-96">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold">📋 Logs en temps réel</h2>
            <span className="text-gray-500">{logs.length} entrées</span>
          </div>
          <div className="border-t border-gray-700 pt-2">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 ${
                    log.includes('[ERROR]') ? 'text-red-400' : 
                    log.includes('[WARN]') ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Cliquez sur "Enable Push" pour tester la souscription</li>
            <li>Observez les logs en temps réel ci-dessus</li>
            <li>Testez une notification locale avec "Test Local Notification"</li>
            <li>Testez une notification serveur avec "Send Push from Server"</li>
            <li>Vérifiez aussi la console du navigateur (F12) pour plus de détails</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
