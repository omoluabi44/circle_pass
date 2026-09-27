'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";

interface QRScannerProps {
  eventId: string;
  onSuccess: () => void;
}

export function QRScanner({ eventId, onSuccess }: QRScannerProps) {
  const { data: session } = useSession();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Prevent multiple initializations in React strict mode
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (!scanning) return;
    setScanning(false);
    
    // Call the API to verify and check in
    try {
      const token = (session as any)?.accessToken;
      const response = await fetch(`${API_URL}/check-in/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_token: decodedText }),
      });

      const data = await response.json();
      setScanResult({
        success: response.ok,
        data
      });
      
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      setScanResult({
        success: false,
        data: { detail: 'Network error occurred during scan.' }
      });
    }
  };

  const onScanFailure = (error: any) => {
    // html5-qrcode calls this frequently on failed frames, ignore it
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanning(true);
  };

  return (
    <div className="flex flex-col items-center">
      {!scanResult && (
        <div className="w-full max-w-md">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-gray-100"></div>
          <p className="text-center text-sm text-gray-500 mt-4">Point camera at the attendee's ticket QR code.</p>
        </div>
      )}

      {scanResult && (
        <div className="w-full max-w-md text-center py-8">
          {scanResult.success ? (
            <div className="flex flex-col items-center text-green-600 mb-6">
              <CheckCircle2 size={64} className="mb-4" />
              <h2 className="text-2xl font-bold font-heading">Valid Ticket</h2>
              <p className="text-gray-600 mt-2">{scanResult.data.detail}</p>
              
              <div className="mt-6 bg-green-50 p-4 rounded-lg w-full text-left">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Attendee</p>
                <p className="font-medium text-lg text-gray-900">{scanResult.data.attendee_name || 'Guest'}</p>
                
                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mt-4">Ticket Type</p>
                <p className="font-medium text-lg text-gray-900">{scanResult.data.ticket_tier}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-6">
              {scanResult.data.status === 'Already Used' ? (
                <AlertCircle size={64} className="text-amber-500 mb-4" />
              ) : (
                <XCircle size={64} className="text-red-500 mb-4" />
              )}
              <h2 className="text-2xl font-bold font-heading text-gray-900">
                {scanResult.data.status || 'Invalid Ticket'}
              </h2>
              <p className="text-gray-600 mt-2">{scanResult.data.detail}</p>
            </div>
          )}

          <button
            onClick={resetScanner}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#5046e5] transition-colors"
          >
            <RefreshCw size={20} />
            Scan Next Ticket
          </button>
        </div>
      )}
    </div>
  );
}
