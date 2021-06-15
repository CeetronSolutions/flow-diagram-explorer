import { MANHATTAN_LENGTH, ORIGIN, vectorLength, pointDifference, pointSum } from "../utils/geometry";
import React from "react";

import { Point } from "../types/point";
import "./../effects/effects.css";

export const usePan = (ref: React.RefObject<HTMLElement>): Point => {
    const [panPosition, setPanPosition] = React.useState<Point>(ORIGIN);
    const referencePositionRef = React.useRef<Point>(ORIGIN);
    const panningStarted = React.useRef<boolean>(false);

    const handleMouseMove = React.useCallback(
        (e: MouseEvent) => {
            const referencePosition = referencePositionRef.current;
            const currentPosition = { x: e.pageX, y: e.pageY };
            const delta = pointDifference(referencePosition, currentPosition);

            if (!panningStarted.current) {
                if (vectorLength(delta) > MANHATTAN_LENGTH) {
                    panningStarted.current = true;
                }
            } else {
                referencePositionRef.current = currentPosition;
                setPanPosition((panPosition) => pointSum(panPosition, delta));
            }
        },
        [panningStarted, setPanPosition]
    );

    const handleMouseUp = React.useCallback(() => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        panningStarted.current = false;
        document.body.classList.remove("FlowDiagramExplorer__effects__unselectable");
    }, [handleMouseMove, panningStarted]);

    const handleMouseDown = React.useCallback(
        (e: MouseEvent) => {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            referencePositionRef.current = { x: e.pageX, y: e.pageY };
            document.body.classList.add("FlowDiagramExplorer__effects__unselectable");
        },
        [handleMouseMove, handleMouseUp]
    );

    React.useEffect(() => {
        if (ref.current) {
            ref.current.addEventListener("mousedown", handleMouseDown);
        }
        return () => {
            if (ref.current) {
                ref.current.removeEventListener("mousedown", handleMouseDown);
            }
        };
    }, []);

    return panPosition;
};
