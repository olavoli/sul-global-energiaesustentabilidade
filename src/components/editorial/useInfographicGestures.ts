import { useRef, type PointerEvent, type RefObject } from "react";

type Point = { x: number; y: number };

/** Keep touch dragging and two-finger zoom inside the opt-in image viewer. */
export function useInfographicGestures(
  viewport: RefObject<HTMLDivElement | null>,
  zoom: number,
  setZoom: (value: number) => void,
) {
  const points = useRef(new Map<number, Point>());
  const origin = useRef({ x: 0, y: 0, left: 0, top: 0, distance: 0, zoom: 1 });

  function resetOrigin() {
    const [first, second] = [...points.current.values()];
    if (!first || !viewport.current) return;
    origin.current = {
      ...first,
      left: viewport.current.scrollLeft,
      top: viewport.current.scrollTop,
      distance: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0,
      zoom,
    };
  }

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType !== "touch") return;
      event.currentTarget.setPointerCapture(event.pointerId);
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      resetOrigin();
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (!points.current.has(event.pointerId) || !viewport.current) return;
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [first, second] = [...points.current.values()];
      if (second && origin.current.distance > 0) {
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        setZoom(
          Math.max(1, Math.min(4, (origin.current.zoom * distance) / origin.current.distance)),
        );
      } else {
        viewport.current.scrollLeft = origin.current.left + origin.current.x - first.x;
        viewport.current.scrollTop = origin.current.top + origin.current.y - first.y;
      }
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      points.current.delete(event.pointerId);
      resetOrigin();
    },
    onPointerCancel() {
      points.current.clear();
    },
  };
}
