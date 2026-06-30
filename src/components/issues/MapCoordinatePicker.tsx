import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { X, MapPin, Search, RefreshCw, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MapCoordinatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat: number | '';
  initialLng: number | '';
  defaultLat: number;
  defaultLng: number;
  onConfirm: (lat: number, lng: number, address: string, district?: string, state?: string) => void;
  title?: string;
  subtitle?: string;
}

export default function MapCoordinatePicker({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  defaultLat,
  defaultLng,
  onConfirm,
  title = "Select Location",
  subtitle = "Pinpoint or search for the exact coordinates",
}: MapCoordinatePickerProps) {
  // Map center and picked location state
  const [pickedLocation, setPickedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({
    lat: defaultLat || 12.9716,
    lng: defaultLng || 77.5946,
  });
  const [mapZoom, setMapZoom] = useState(15);
  
  // Search and Geocoding state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState('');
  const [extractedDistrict, setExtractedDistrict] = useState('');
  const [extractedState, setExtractedState] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize coordinates from initial values
  useEffect(() => {
    if (isOpen) {
      if (typeof initialLat === 'number' && typeof initialLng === 'number') {
        const coords = { lat: initialLat, lng: initialLng };
        setPickedLocation(coords);
        setMapCenter(coords);
        fetchAddress(coords.lat, coords.lng);
      } else {
        const coords = { lat: defaultLat || 12.9716, lng: defaultLng || 77.5946 };
        setPickedLocation(null);
        setMapCenter(coords);
        setReverseGeocodedAddress('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialLat, initialLng, defaultLat, defaultLng]);

  // Handle map click to select a coordinate
  const handleMapClick = useCallback((e: any) => {
    let lat: number | undefined;
    let lng: number | undefined;

    if (e.detail?.latLng) {
      lat = e.detail.latLng.lat;
      lng = e.detail.latLng.lng;
    } else if (e.latLng) {
      if (typeof e.latLng.lat === 'function') {
        lat = e.latLng.lat();
        lng = e.latLng.lng();
      } else {
        lat = e.latLng.lat;
        lng = e.latLng.lng;
      }
    }

    if (lat !== undefined && lng !== undefined) {
      const coords = { lat, lng };
      setPickedLocation(coords);
      fetchAddress(lat, lng);
    }
  }, []);

  // Fetch address from coordinates (Reverse Geocoding)
  const fetchAddress = (lat: number, lng: number) => {
    if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
      setReverseGeocodedAddress(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      return;
    }

    setIsGeocoding(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      setIsGeocoding(false);
      if (status === 'OK' && results && results[0]) {
        const result = results[0];
        setReverseGeocodedAddress(result.formatted_address);

        let district = '';
        let state = '';
        for (const component of result.address_components) {
          if (component.types.includes('administrative_area_level_2')) {
            district = component.long_name;
          } else if (component.types.includes('locality') && !district) {
            district = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
        }
        setExtractedDistrict(district);
        setExtractedState(state);
      } else {
        setReverseGeocodedAddress(`Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setExtractedDistrict('');
        setExtractedState('');
      }
    });
  };

  // Search locality / address using Geocoder
  const handleSearchLocality = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
      setErrorMsg('Geocoding service is offline or not loaded.');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      setIsSearching(false);
      if (status === 'OK' && results && results[0]) {
        const result = results[0];
        const loc = result.geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        setMapCenter(coords);
        setPickedLocation(coords);
        setMapZoom(16);
        setReverseGeocodedAddress(result.formatted_address);

        let district = '';
        let state = '';
        for (const component of result.address_components) {
          if (component.types.includes('administrative_area_level_2')) {
            district = component.long_name;
          } else if (component.types.includes('locality') && !district) {
            district = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
        }
        setExtractedDistrict(district);
        setExtractedState(state);
      } else {
        setErrorMsg('Could not find the specified location. Please try a different query.');
      }
    });
  };

  // Grab user current GPS location inside the map
  const handleGPSLocate = () => {
    setGpsLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Your browser does not support geolocation tracking.");
      setGpsLoading(false);
      return;
    }

    const optionsHigh = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    const optionsLow = { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 };

    const successCallback = (position: GeolocationPosition) => {
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setMapCenter(coords);
      setPickedLocation(coords);
      setMapZoom(16);
      fetchAddress(coords.lat, coords.lng);
      setGpsLoading(false);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.warn("GPS lookup (high accuracy) failed:", error.message, "code:", error.code);
      
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        // Fallback to low-accuracy standard geolocation query
        setErrorMsg("High accuracy GPS signal weak. Trying standard localization fallback...");
        navigator.geolocation.getCurrentPosition(
          successCallback,
          (err2) => {
            console.warn("GPS fallback low-accuracy failed:", err2.message);
            handleFinalGPSError(err2);
          },
          optionsLow
        );
      } else {
        handleFinalGPSError(error);
      }
    };

    const tryIPGeolocation = async () => {
      setErrorMsg("GPS signal unavailable. Trying IP-based network geolocation fallback...");
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude) {
            const coords = { lat: Number(data.latitude), lng: Number(data.longitude) };
            setMapCenter(coords);
            setPickedLocation(coords);
            setMapZoom(14);
            fetchAddress(coords.lat, coords.lng);
            setErrorMsg(null);
            setGpsLoading(false);
            return true;
          }
        }
      } catch (err) {
        console.warn("IP Geolocation 1 failed:", err);
      }
      
      try {
        const response = await fetch("https://ip-api.com/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lon) {
            const coords = { lat: Number(data.lat), lng: Number(data.lon) };
            setMapCenter(coords);
            setPickedLocation(coords);
            setMapZoom(14);
            fetchAddress(coords.lat, coords.lng);
            setErrorMsg(null);
            setGpsLoading(false);
            return true;
          }
        }
      } catch (err) {
        console.warn("IP Geolocation 2 failed:", err);
      }
      return false;
    };

    const handleFinalGPSError = async (error: GeolocationPositionError) => {
      console.warn("Final HTML5 Geolocation failed. Trying network backup...");
      const ipSuccess = await tryIPGeolocation();
      if (ipSuccess) return;

      let customMsg = "Unable to automatically fetch your coordinates. Please click directly on the map to pin your location.";
      
      if (error.code === error.PERMISSION_DENIED) {
        customMsg = "Location permission was denied by browser or iframe policy. Please click directly on the map, or open the app in a new tab.";
      } else if (error.code === error.TIMEOUT) {
        customMsg = "Location request timed out. Please click directly on the map to pin your location manually.";
      }
      
      setErrorMsg(customMsg);
      setGpsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, optionsHigh);
  };

  // Pin default test location (Bangalore center)
  const pinDefaultTestLocation = () => {
    const coords = { lat: defaultLat || 12.9716, lng: defaultLng || 77.5946 };
    setMapCenter(coords);
    setPickedLocation(coords);
    setMapZoom(15);
    fetchAddress(coords.lat, coords.lng);
    setErrorMsg(null);
  };

  // Confirm selection and pass data back
  const handleConfirm = () => {
    if (!pickedLocation) {
      setErrorMsg('Please click on the map to select a coordinate location first.');
      return;
    }
    onConfirm(pickedLocation.lat, pickedLocation.lng, reverseGeocodedAddress, extractedDistrict, extractedState);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">{title}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          
          {!hasValidKey ? (
            /* Google Maps API Key Setup Guidance */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-5">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                <AlertTriangle className="w-12 h-12 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Google Maps Platform Key Required</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  To view the interactive locality map and select coordinates, please add your Google Maps API Key to the applet secrets.
                </p>
              </div>

              <div className="w-full bg-white p-5 rounded-xl border border-slate-200 text-left space-y-3 shadow-sm">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                  Create or get an API key:
                </p>
                <a
                  href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-teal-600 hover:underline pl-7 font-semibold"
                >
                  console.cloud.google.com/google/maps-apis/start
                </a>

                <p className="text-xs font-bold text-slate-700 flex items-center gap-2 pt-2">
                  <span className="w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                  Add key in AI Studio Secrets:
                </p>
                <ul className="text-[11px] text-slate-500 pl-7 list-disc space-y-1">
                  <li>Click <strong>Settings</strong> (⚙️ gear icon, top-right corner)</li>
                  <li>Select <strong>Secrets</strong></li>
                  <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the name, press <strong>Enter</strong></li>
                  <li>Paste your API key as the value, press <strong>Enter</strong></li>
                </ul>
              </div>

              <div className="text-[10px] text-slate-400">
                The application will rebuild automatically within seconds of adding the secret.
              </div>
            </div>
          ) : (
            /* Live Interactive Map UI */
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Geocoding search & GPS auto tools */}
              <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-2 shrink-0">
                <form onSubmit={handleSearchLocality} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search for locality, neighborhood, or sector..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleGPSLocate}
                  disabled={gpsLoading}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 justify-center transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                  {gpsLoading ? 'Detecting...' : 'Locate My GPS'}
                </button>
              </div>

              {/* Map container - Note: Needs explicit height / flex-1 */}
              <div className="flex-1 min-h-0 relative">
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    onCenterChanged={(e) => setMapCenter(e.detail.center)}
                    onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                    onClick={handleMapClick}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                  >
                    {pickedLocation && (
                      <AdvancedMarker position={pickedLocation}>
                        <Pin background="#0ea5e9" borderColor="#0284c7" glyphColor="#ffffff" />
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>

                {errorMsg && (
                  <div className="absolute top-3 left-3 right-3 bg-red-500 text-white text-[11px] font-semibold py-2.5 px-4 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-2.5 z-10 border border-red-400">
                    <div className="flex flex-col gap-1 pr-2">
                      <span>{errorMsg}</span>
                      <button
                        type="button"
                        onClick={pinDefaultTestLocation}
                        className="text-left font-bold underline hover:text-red-100 transition-colors flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        ⚡ Use Sample Location for Testing
                      </button>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="hover:opacity-80 shrink-0 self-end md:self-center cursor-pointer p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Location Details Panel */}
              <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Selected Location</p>
                    <p className="text-xs text-slate-800 font-semibold mt-0.5 truncate">
                      {isGeocoding ? (
                        <span className="text-slate-400 italic flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Fetching nearest address...
                        </span>
                      ) : reverseGeocodedAddress ? (
                        reverseGeocodedAddress
                      ) : (
                        <span className="text-slate-400 italic">Click on the map to pin the issue location...</span>
                      )}
                    </p>
                    {pickedLocation && (
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        Lat: {pickedLocation.lat.toFixed(6)}, Lng: {pickedLocation.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!pickedLocation}
                      className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Selected Location
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
