import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// عدّل المسار حسب الاسم المستعار المعتمد في المشروع (مثل @shared أو مسار نسبي)
import { ADEN_SQUARES, type AdenSquare } from "@shared/adenSquares";

const DISTRICT_COLORS: Record<string, string> = {
  المنصورة: "#378ADD",
  "الشيخ عثمان": "#D85A30",
  البريقة: "#1D9E75",
  كريتر: "#7F77DD",
  المعلا: "#BA7517",
  خورمكسر: "#D4537E",
};

type Props = {
  height?: number;
  squares?: AdenSquare[];
  onSelect?: (square: AdenSquare) => void;
};

export default function AdenSquaresMap({
  height = 520,
  squares = ADEN_SQUARES,
  onSelect,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<AdenSquare | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const group = L.featureGroup().addTo(map);
    const layers = new Map<number, L.Polygon>();
    const style = (s: AdenSquare, on: boolean): L.PathOptions => {
      const c = DISTRICT_COLORS[s.district] ?? "#444";
      return { color: c, weight: on ? 4 : 2, fillColor: c, fillOpacity: on ? 0.55 : 0.28 };
    };

    squares.forEach((s) => {
      const poly = L.polygon(s.polygon, style(s, false)).addTo(group);
      layers.set(s.number, poly);
      poly.on("click", () => {
        layers.forEach((l, n) => l.setStyle(style(squares.find((q) => q.number === n)!, n === s.number)));
        setSelected(s);
        onSelect?.(s);
      });
      L.marker(s.center, {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,-50%);background:#fff;border:2px solid ${
            DISTRICT_COLORS[s.district] ?? "#444"
          };border-radius:10px;padding:0 6px;font-weight:700;font-size:12px">${s.number}</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(group);
    });

    map.fitBounds(group.getBounds(), { padding: [20, 20] });
    return () => {
      map.remove();
    };
  }, [squares, onSelect]);

  return (
    <div dir="rtl" className="space-y-3">
      <div ref={el} style={{ height }} className="w-full rounded-lg border" />
      <div className="rounded-lg border p-3 text-sm leading-7">
        {selected ? (
          <>
            <div className="font-medium">
              {selected.name} — {selected.district} — {selected.responsibleBranch}
            </div>
            <div>الموقع: {selected.location}</div>
            <div>النشاط: {selected.activity}</div>
            <div>المزايا: {selected.advantages}</div>
            <div>الفرص: {selected.opportunities}</div>
          </>
        ) : (
          <span className="text-muted-foreground">اضغط على أي مربع لعرض تفاصيله.</span>
        )}
      </div>
    </div>
  );
}
