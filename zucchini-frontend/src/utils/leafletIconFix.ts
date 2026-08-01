import L from "leaflet";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import icon from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

// Vite doesn't resolve Leaflet's default marker image paths the way webpack's
// file-loader used to, so out of the box every <Marker> renders as a broken
// image icon. This patches the default icon prototype once, app-wide, so
// every existing map (Tracking, DispatchBoard, Dashboard) and the new
// LocationPicker all get working pins without each needing its own fix.
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow,
});
