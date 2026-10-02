'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Camera, ChevronDown, Scan } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";

interface QRScannerProps {
  eventId: string;
  onSuccess: () => void;
}

export function QRScanner({ eventId, onSuccess }: QRScannerProps) {
  const { data: session } = useSession();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
        }
      })
      .catch((err) => console.error("Error getting cameras", err));

    scannerRef.current = new Html5Qrcode("qr-reader");

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (!scanning) return;
    
    // Stop scanning immediately on success
    if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(console.error);
    }
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
        body: JSON.stringify({ qr_token: decodedText, event_id: eventId }),
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
    // ignore
  };

  const toggleScanning = async () => {
    if (!scannerRef.current) return;

    if (scanning) {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(console.error);
      }
      setScanning(false);
    } else {
      if (selectedCamera) {
        try {
          await scannerRef.current.start(
            selectedCamera,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            onScanFailure
          );
          setScanning(true);
        } catch (err) {
          console.error("Failed to start scanner", err);
        }
      }
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanning(false);
  };

  // Extract short label for camera (e.g. "Back Camera")
  const getCameraLabel = (label: string) => {
    if (!label) return "Camera";
    if (label.toLowerCase().includes('back') || label.toLowerCase().includes('environment')) return "Back Camera";
    if (label.toLowerCase().includes('front') || label.toLowerCase().includes('user')) return "Front Camera";
    return label.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/g, '').trim();
  };

  return (
    <div className="flex flex-col w-full">
      {!scanResult && (
        <div className="w-full">
          <div className="flex items-center border border-gray-200 rounded-xl p-3 mb-4 bg-gray-50/50">
             <div className="flex items-center gap-2 pr-4 border-r border-gray-200 text-gray-900 font-semibold text-sm whitespace-nowrap">
                <Camera className="w-5 h-5 text-[#6366f1]" />
                Select Camera
             </div>
             <div className="flex-1 pl-4 relative">
                <select 
                   value={selectedCamera}
                   onChange={(e) => setSelectedCamera(e.target.value)}
                   className="w-full bg-transparent appearance-none text-gray-700 font-medium text-sm outline-none pr-8 cursor-pointer"
                   disabled={scanning}
                >
                   {cameras.length === 0 && <option value="">No cameras found</option>}
                   {cameras.map(c => (
                      <option key={c.id} value={c.id}>
                        {getCameraLabel(c.label) || `Camera ${c.id.substring(0, 5)}`}
                      </option>
                   ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
          </div>

          <button
             onClick={toggleScanning}
             className="w-full bg-[#6366f1] text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold text-base hover:bg-[#5046e5] transition-colors shadow-sm"
          >
             <Scan className="w-5 h-5" />
             {scanning ? 'Stop Scanning' : 'Start Scanning'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-5">
             Point camera at the attendee's ticket QR code.
          </p>

          <div 
             id="qr-reader" 
             className={`w-full mt-4 rounded-xl overflow-hidden [&_video]:rounded-xl [&_#qr-shaded-region]:rounded-xl ${scanning ? 'block' : 'hidden'}`}
          ></div>
        </div>
      )}

      {scanResult && (
        <div className="w-full text-center py-4">
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
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-[#6366f1] text-white rounded-xl font-semibold text-base hover:bg-[#5046e5] transition-colors shadow-sm"
          >
            <RefreshCw size={20} />
            Scan Next Ticket
          </button>
        </div>
      )}
    </div>
  );
}
