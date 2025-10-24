import { MapContainer, TileLayer} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ClickMarker from './ClickMarker';


export default function App() {
    return (
        <MapContainer
            center={[37.5665, 126.9780]} // 서울 시청 좌표
            zoom={13}
            style={{ height: "100vh", width: "100%" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
            />
            <ClickMarker />
        </MapContainer>
    );
}
