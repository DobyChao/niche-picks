const GCJ02_PI = 3.14159265358979324;
const GCJ02_A = 6378245.0;
const GCJ02_EE = 0.00669342162296594323;

function gcj02OutOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function gcj02TransformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * GCJ02_PI) + 20.0 * Math.sin(2.0 * x * GCJ02_PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * GCJ02_PI) + 40.0 * Math.sin(y / 3.0 * GCJ02_PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * GCJ02_PI) + 320 * Math.sin(y * GCJ02_PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function gcj02TransformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * GCJ02_PI) + 20.0 * Math.sin(2.0 * x * GCJ02_PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * GCJ02_PI) + 40.0 * Math.sin(x / 3.0 * GCJ02_PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * GCJ02_PI) + 300.0 * Math.sin(x / 30.0 * GCJ02_PI)) * 2.0 / 3.0;
  return ret;
}

/**
 * WGS-84 → GCJ-02 ("火星坐标") conversion, computed locally (no network round-trip).
 *
 * Browser Geolocation always returns raw WGS-84 coordinates, but AMap's basemap uses
 * GCJ-02. Previously this app called `AMap.convertFrom`, which proxies through our own
 * `/api/amap/proxy` route to AMap's servers — an extra network hop that can be slow or
 * time out, and on timeout the caller fell back to using the *raw, unconverted* WGS-84
 * coordinates directly on the GCJ-02 map. That produces the classic multi-hundred-meter
 * "定位偏移" (location offset) whenever the round trip is slow. Doing the conversion
 * locally removes that failure mode entirely.
 */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (gcj02OutOfChina(lng, lat)) return [lng, lat];

  let dLat = gcj02TransformLat(lng - 105.0, lat - 35.0);
  let dLng = gcj02TransformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * GCJ02_PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ02_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ02_A * (1 - GCJ02_EE)) / (magic * sqrtMagic)) * GCJ02_PI);
  dLng = (dLng * 180.0) / ((GCJ02_A / sqrtMagic) * Math.cos(radLat) * GCJ02_PI);

  return [lng + dLng, lat + dLat];
}
