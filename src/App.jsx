import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 마커 아이콘 수정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 깃발 아이콘 생성
const flagIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <path d="M5 5 L5 35 M5 5 L25 10 L5 15 Z" fill="red" stroke="black" stroke-width="1"/>
    </svg>
  `),
    iconSize: [30, 40],
    iconAnchor: [5, 35],
    popupAnchor: [0, -35]
});

// 지도 중심 이동 컴포넌트
function MapController({ center, zoom }) {
    const map = useMap();

    React.useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);

    return null;
}

// 클릭으로 마커 추가
function ClickHandler({ onAddMarker }) {
    const map = useMap();

    React.useEffect(() => {
        const handleClick = (e) => {
            onAddMarker({
                id: Date.now(),
                position: [e.latlng.lat, e.latlng.lng],
                name: `마커 ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
            });
        };

        map.on('click', handleClick);
        return () => map.off('click', handleClick);
    }, [map, onAddMarker]);

    return null;
}

export default function App() {
    const [markers, setMarkers] = useState([]);
    const [flags, setFlags] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState([37.5665, 126.9780]);
    const [mapZoom, setMapZoom] = useState(13);
    const [loading, setLoading] = useState(false);

    // 두 좌표 간 거리 계산 (km)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // 방향별 목표 좌표 계산 (약 5km)
    const getDirectionCoordinates = (lat, lng) => {
        const kmPerDegree = 111;
        const offset = 5 / kmPerDegree;

        return {
            north: [lat + offset, lng],
            south: [lat - offset, lng],
            east: [lat, lng + offset / Math.cos(lat * Math.PI / 180)],
            west: [lat, lng - offset / Math.cos(lat * Math.PI / 180)]
        };
    };

    // OSRM으로 도보 경로 찾기
    const findWalkingRoute = async (start, end) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                const distance = route.distance / 1000; // km

                return { coordinates, distance };
            }
            return null;
        } catch (error) {
            console.error('경로 찾기 오류:', error);
            return null;
        }
    };

    // 주변 주요 지점 찾기
    const findNearbyPOI = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
            );
            const data = await response.json();
            return data.display_name || `위치 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            return `위치 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    };

    // 5km 깃발 생성
    const createFlags = async (markerPosition) => {
        setLoading(true);
        const newFlags = [];
        const newRoutes = [];

        const directions = getDirectionCoordinates(markerPosition[0], markerPosition[1]);
        const directionNames = { north: '북쪽', south: '남쪽', east: '동쪽', west: '서쪽' };

        for (const [direction, targetPos] of Object.entries(directions)) {
            const routeData = await findWalkingRoute(markerPosition, targetPos);

            if (routeData && routeData.distance >= 4 && routeData.distance <= 6) {
                const endPos = routeData.coordinates[routeData.coordinates.length - 1];
                const poiName = await findNearbyPOI(endPos[0], endPos[1]);

                newFlags.push({
                    id: `flag-${Date.now()}-${direction}`,
                    position: endPos,
                    name: poiName,
                    direction: directionNames[direction],
                    distance: routeData.distance.toFixed(2)
                });

                newRoutes.push({
                    id: `route-${Date.now()}-${direction}`,
                    coordinates: routeData.coordinates,
                    color: '#2196F3'
                });
            }

            // API 호출 제한을 위한 딜레이
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setFlags(prev => [...prev, ...newFlags]);
        setRoutes(prev => [...prev, ...newRoutes]);
        setLoading(false);
    };

    // 마커 추가
    const addMarker = async (marker) => {
        setMarkers(prev => [...prev, marker]);
        await createFlags(marker.position);
    };

    // 마커 삭제
    const deleteMarker = (id) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    };

    // 모든 마커 및 깃발 삭제
    const clearAllMarkers = () => {
        setMarkers([]);
        setFlags([]);
        setRoutes([]);
    };

    // 장소 검색
    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newPosition = [parseFloat(lat), parseFloat(lon)];

                setMapCenter(newPosition);
                setMapZoom(15);

                await addMarker({
                    id: Date.now(),
                    position: newPosition,
                    name: display_name
                });

                setSearchQuery('');
            } else {
                alert('검색 결과를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('검색 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            setSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            searchLocation();
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
            {/* 사이드바 */}
            <div style={{
                width: '320px',
                background: '#fff',
                borderRight: '1px solid #ddd',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* 검색 영역 */}
                <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                    <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#333' }}>🗺️ 지도 앱</h2>
                    <div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="장소나 주소를 검색하세요..."
                            disabled={searching || loading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={searchLocation}
                            disabled={searching || loading}
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '10px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (searching || loading) ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {searching ? '검색 중...' : loading ? '경로 생성 중...' : '🔍 검색'}
                        </button>
                    </div>
                    <p style={{
                        margin: '10px 0 0 0',
                        fontSize: '12px',
                        color: '#666'
                    }}>
                        💡 지도를 클릭하면 마커와 5km 깃발이 생성돼요
                    </p>
                    {loading && (
                        <p style={{
                            margin: '10px 0 0 0',
                            fontSize: '12px',
                            color: '#2196F3',
                            fontWeight: '500'
                        }}>
                            ⏳ 4방향 경로를 찾는 중... (최대 30초 소요)
                        </p>
                    )}
                </div>

                {/* 마커 및 깃발 목록 */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '15px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                            마커 ({markers.length}) · 깃발 ({flags.length})
                        </h3>
                        {(markers.length > 0 || flags.length > 0) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearAllMarkers();
                                }}
                                style={{
                                    padding: '5px 10px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                전체 삭제
                            </button>
                        )}
                    </div>

                    {markers.length === 0 && flags.length === 0 ? (
                        <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                            마커가 없습니다.<br />검색하거나 지도를 클릭해보세요!
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {markers.map((marker) => (
                                <div
                                    key={marker.id}
                                    style={{
                                        padding: '12px',
                                        background: '#e3f2fd',
                                        border: '1px solid #2196F3',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: '#333',
                                            marginBottom: '4px',
                                            wordBreak: 'break-word'
                                        }}>
                                            📍 {marker.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            {marker.position[0].toFixed(5)}, {marker.position[1].toFixed(5)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMarker(marker.id);
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            background: '#ff5252',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            flexShrink: 0
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}

                            {flags.map((flag) => (
                                <div
                                    key={flag.id}
                                    style={{
                                        padding: '10px',
                                        background: '#fff3e0',
                                        border: '1px solid #ff9800',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: '#333',
                                        marginBottom: '4px',
                                        wordBreak: 'break-word'
                                    }}>
                                        🚩 {flag.direction} ({flag.distance}km)
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666' }}>
                                        {flag.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 지도 영역 */}
            <div style={{ flex: 1 }}>
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    <MapController center={mapCenter} zoom={mapZoom} />
                    <ClickHandler onAddMarker={addMarker} />

                    {/* 마커 */}
                    {markers.map((marker) => (
                        <Marker key={marker.id} position={marker.position}>
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    <strong>{marker.name}</strong><br />
                                    <small>
                                        {marker.position[0].toFixed(5)}, {marker.position[1].toFixed(5)}
                                    </small>
                                    <br />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMarker(marker.id);
                                        }}
                                        style={{
                                            marginTop: '8px',
                                            padding: '4px 10px',
                                            background: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            width: '100%'
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* 깃발 */}
                    {flags.map((flag) => (
                        <Marker key={flag.id} position={flag.position} icon={flagIcon}>
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    <strong>🚩 {flag.direction}</strong><br />
                                    <small>거리: {flag.distance}km</small><br />
                                    <small>{flag.name}</small>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* 경로 선 */}
                    {routes.map((route) => (
                        <Polyline
                            key={route.id}
                            positions={route.coordinates}
                            color={route.color}
                            weight={4}
                            opacity={0.7}
                        />
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}