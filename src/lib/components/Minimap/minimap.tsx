import React from "react";
import clsx from "clsx";

import { Point } from "../../types/point";
import { Size } from "../../types/dimensions";
import { useMouseDrag } from "../../hooks/useMouseDrag";

import "./minimap.css";
import "./../../effects/effects.css";

type MinimapPropsType = {
    initialCenterPoint: Point;
    Scene: React.ReactElement;
    scaling: number;
    viewSize: Size;
    boundaryBox: Size;
    onCenterPointChange?: (newCenterPoint: Point) => void;
    margin: number;
};

export const calcCenterPointWithinBoundaryBox = (centerPoint: Point, viewSize: Size, boundaryBox: Size): Point => {
    const minX = viewSize.width / 2;
    const maxX = boundaryBox.width - viewSize.width / 2;
    const minY = viewSize.height / 2;
    const maxY = boundaryBox.height - viewSize.height / 2;
    const x = Math.max(minX, Math.min(maxX, centerPoint.x));
    const y = Math.max(minY, Math.min(maxY, centerPoint.y));
    return { x: x, y: y };
};

export const Minimap: React.FC<MinimapPropsType> = (props: MinimapPropsType): JSX.Element => {
    const { initialCenterPoint, Scene, scaling, viewSize, boundaryBox, onCenterPointChange, margin } = props;

    const [centerPoint, setCenterPoint] = React.useState(initialCenterPoint);
    const [mouseDownPosition, setMouseDownPosition] = React.useState({ x: 0, y: 0 });

    const viewRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const { dragging, dragDistance } = useMouseDrag(viewRef);

    React.useEffect(() => {
        setCenterPoint(initialCenterPoint);
    }, [initialCenterPoint]);

    React.useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            setMouseDownPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (onCenterPointChange && Math.sqrt(Math.pow(e.clientX - mouseDownPosition.x, 2) + Math.pow(e.clientY - mouseDownPosition.y, 2)) < 13.11) {
                const newCenterPoint = { x: (mouseDownPosition.x - mapRef.current!.getBoundingClientRect().left) / scaling, y: (mouseDownPosition.y - mapRef.current!.getBoundingClientRect().top) / scaling };
                const adjustedCenterPoint = calcCenterPointWithinBoundaryBox(newCenterPoint, viewSize, boundaryBox);
                setCenterPoint(adjustedCenterPoint);
                onCenterPointChange(adjustedCenterPoint);
            }
        };

        if (mapRef.current) {
            mapRef.current.addEventListener("mousedown", handleMouseDown);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.removeEventListener("mousedown", handleMouseDown);
                window.removeEventListener("mouseup", handleMouseUp);
            }
        }
    }, [mapRef, mouseDownPosition]);

    React.useEffect(() => {
        if (dragging) {
            if (onCenterPointChange) {
                onCenterPointChange(
                    calcCenterPointWithinBoundaryBox(
                        { x: centerPoint.x + dragDistance.x / scaling, y: centerPoint.y + dragDistance.y / scaling },
                        viewSize,
                        boundaryBox
                    )
                );
            }
        }
        if (!dragging) {
            setCenterPoint(
                calcCenterPointWithinBoundaryBox(
                    {
                        x: centerPoint.x + dragDistance.x / scaling,
                        y: centerPoint.y + dragDistance.y / scaling
                    },
                    viewSize,
                    boundaryBox
                )
            );
        }
    }, [dragDistance, dragging]);

    const calculatedCenterPoint = dragging
        ? calcCenterPointWithinBoundaryBox(
            { x: centerPoint.x + dragDistance.x / scaling, y: centerPoint.y + dragDistance.y / scaling },
            viewSize,
            boundaryBox
        )
        : centerPoint;

    return (
        <div
            className={clsx("Minimap", "effects__unselectable")}
            style={{ width: boundaryBox.width * scaling, height: boundaryBox.height * scaling }}
            ref={mapRef}
        >
            <div style={{ transform: `scale(${scaling}, ${scaling})`, transformOrigin: "0 0" }}>
                {React.cloneElement(Scene, {
                    centerPoint: { x: boundaryBox.width / 2, y: boundaryBox.height / 2 },
                    dimensions: { width: boundaryBox.width, height: boundaryBox.height },
                    margin: margin
                })}
                <div
                    ref={viewRef}
                    className="Minimap__View"
                    style={{
                        width: viewSize.width,
                        height: viewSize.height,
                        left: calculatedCenterPoint.x - viewSize.width / 2,
                        top: calculatedCenterPoint.y - viewSize.height / 2
                    }}
                ></div>
            </div>
        </div>
    );
};