'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, CameraDevice, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  const [cameraError, setCameraError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const initCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
        } else {
          setCameraError("No cameras found on this device.");
        }
      } catch (err) {
        console.error("Error getting cameras", err);
        setCameraError("Camera permission denied or unsupported context (use HTTPS or localhost).");
      }
    };

    initCameras();
    scannerRef.current = new Html5Qrcode("qr-reader");

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === 2 /* SCANNING */) {
            scannerRef.current.stop().catch(console.error);
          }
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (!scanning) return;
    
    // Stop scanning immediately on success
    try {
      if (scannerRef.current && scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
      }
    } catch(e) {
      console.error(e);
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
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
      } catch(e) {
        console.error(e);
      }
      setScanning(false);
    } else {
      // If selectedCamera is empty, try requesting cameras again
      if (!selectedCamera) {
        alert(cameraError || "Please select a camera or ensure permissions are granted.");
        return;
      }

      setScanning(true);
      
      // Wait a tick for React to flush the 'hidden' class removal from the DOM
      // before Html5Qrcode tries to calculate dimensions.
      setTimeout(async () => {
        try {
          if (scannerRef.current) {
            await scannerRef.current.start(
              selectedCamera,
              { fps: 10, qrbox: { width: 250, height: 250 }, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] },
              onScanSuccess,
              onScanFailure
            );
          }
        } catch (err) {
          console.error("Failed to start scanner", err);
          setScanning(false);
          alert("Failed to start camera. Please ensure permissions are granted.");
        }
      }, 100);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanning(false);
  };

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

          {cameraError && !scanning && (
            <p className="text-center text-sm text-red-500 mt-4 font-medium">
               {cameraError}
            </p>
          )}

          <div 
             id="qr-reader" 
             className={`w-full rounded-xl overflow-hidden [&_video]:rounded-xl [&_#qr-shaded-region]:rounded-xl ${scanning ? 'mt-4 block' : 'hidden'}`}
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
