import { useState } from 'react';
import { Marker, useMapEvents, Popup } from 'react-leaflet';

export default function ClickMarker() {
    const [position, setPosition] = useState(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position ? (
        <Marker position={position}>
            <Popup>선택한 위치: <br />{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</Popup>
        </Marker>
    ) : null;
}