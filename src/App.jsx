import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 마커 아이콘 수정 (기본 아이콘 안 보이는 문제 해결)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState([37.5665, 126.9780]);
    const [mapZoom, setMapZoom] = useState(13);

    // 마커 추가
    const addMarker = (marker) => {
        setMarkers(prev => [...prev, marker]);
    };

    // 마커 삭제
    const deleteMarker = (id) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    };

    // 모든 마커 삭제
    const clearAllMarkers = () => {
        setMarkers([]);
    };

    // 장소 검색 (Nominatim API)
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

                // 지도 중심 이동
                setMapCenter(newPosition);
                setMapZoom(15);

                // 마커 추가
                addMarker({
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
                            disabled={searching}
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
                            disabled={searching}
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '10px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: searching ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {searching ? '검색 중...' : '🔍 검색'}
                        </button>
                    </div>
                    <p style={{
                        margin: '10px 0 0 0',
                        fontSize: '12px',
                        color: '#666'
                    }}>
                        💡 지도를 클릭해도 마커를 추가할 수 있어요
                    </p>
                </div>

                {/* 마커 목록 */}
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
                            마커 목록 ({markers.length})
                        </h3>
                        {markers.length > 0 && (
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

                    {markers.length === 0 ? (
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
                                        background: '#f9f9f9',
                                        border: '1px solid #eee',
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
                </MapContainer>
            </div>
        </div>
    );
}