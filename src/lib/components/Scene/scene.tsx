import React from "react";

import { SceneItemPropsType, SceneItemAnimationType, SceneItemType } from "../SceneItem";
import { Point } from "../../types/point";
import { Size } from "../../types/size";

import "./scene.css";
import { usePrevious } from "../../hooks/usePrevious";

export type ScenePropsType = {
    id: string;
    centerPoint?: Point;
    viewSize?: Size;
    size: Size;
    onNodeClick?: (nodeId: string) => void;
    onNodeEnter?: (nodeId: string) => void;
    onNodeLeave?: (nodeId: string) => void;
    children?: React.ReactElement<SceneItemPropsType>[];
};

export const Scene: React.FC<ScenePropsType> = React.memo((props: ScenePropsType): JSX.Element => {
    const { id, centerPoint, viewSize, size, onNodeClick, onNodeEnter, onNodeLeave, children } = props;
    const [previousChildren, setPreviousChildren] = React.useState<
        React.ReactElement<SceneItemPropsType>[] | undefined
    >([]);
    const [previousId, setPreviousId] = React.useState<string>(id);
    const [previousSize, setPreviousSize] = React.useState<Size | undefined>(size);
    const [animations, setAnimations] = React.useState<SceneItemAnimationType[]>([]);
    const [animationFader, setAnimationFader] = React.useState(0);
    const prevChildren = usePrevious<React.ReactElement<SceneItemPropsType>[] | undefined>(children);
    const prevSize = usePrevious<Size>(size);

    React.useEffect(() => {
        const handledIds: string[] = [];
        const newAnimations: SceneItemAnimationType[] = [];
        if (id === previousId) {
            if (children) {
                children.forEach((child) => {
                    let handled = false;
                    if (child.props.type === SceneItemType.Node) {
                        // Change position if node already exists
                        if (prevChildren) {
                            const prevChild = prevChildren.find((el) => el.props.id === child.props.id);
                            if (prevChild) {
                                newAnimations.push({
                                    id: child.props.id,
                                    fadePositions: [
                                        {
                                            fadePosition: 0,
                                            attributes: {
                                                position: prevChild.props.position,
                                            },
                                        },
                                        {
                                            fadePosition: 0.5,
                                            attributes: {
                                                position: prevChild.props.position,
                                            },
                                        },
                                        {
                                            fadePosition: 1,
                                            attributes: {
                                                position: child.props.position,
                                            },
                                        },
                                    ],
                                });
                                handled = true;
                            }
                        }
                        // Otherwise, pop up element
                        if (!handled) {
                            if (child.props.type === SceneItemType.Node) {
                                newAnimations.push({
                                    id: child.props.id,
                                    fadePositions: [
                                        {
                                            fadePosition: 0,
                                            attributes: {
                                                opacity: 0.0,
                                                size: { width: 0, height: 0 },
                                            },
                                        },
                                        {
                                            fadePosition: 0.5,
                                            attributes: {
                                                opacity: 0.0,
                                                size: { width: 0, height: 0 },
                                            },
                                        },
                                        {
                                            fadePosition: 1,
                                            attributes: {
                                                opacity: 1.0,
                                                size: child.props.size,
                                            },
                                        },
                                    ],
                                });
                            }
                        }
                    }

                    handled = false;
                    if (child.props.type === SceneItemType.Flow || child.props.type === SceneItemType.Label) {
                        if (prevChildren) {
                            const prevChild = prevChildren.find((el) => el.props.id === child.props.id);
                            if (prevChild) {
                                newAnimations.push({
                                    id: child.props.id,
                                    fadePositions: [
                                        {
                                            fadePosition: 0,
                                            attributes: {
                                                opacity: 0.0,
                                                size: { width: 0, height: 0 },
                                            },
                                        },
                                        {
                                            fadePosition: 0.75,
                                            attributes: {
                                                opacity: 0.0,
                                                size: { width: 0, height: 0 },
                                            },
                                        },
                                        {
                                            fadePosition: 1,
                                            attributes: {
                                                opacity: 1.0,
                                                size: child.props.size,
                                            },
                                        },
                                    ],
                                });
                                handled = true;
                            }
                        }
                        if (!handled) {
                            newAnimations.push({
                                id: child.props.id,
                                fadePositions: [
                                    {
                                        fadePosition: 0,
                                        attributes: {
                                            opacity: 0.0,
                                            size: { width: 0, height: 0 },
                                        },
                                    },
                                    {
                                        fadePosition: 0.5,
                                        attributes: {
                                            opacity: 0.0,
                                            size: { width: 0, height: 0 },
                                        },
                                    },
                                    {
                                        fadePosition: 1,
                                        attributes: {
                                            opacity: 1.0,
                                            size: child.props.size,
                                        },
                                    },
                                ],
                            });
                        }
                    }
                    handledIds.push(child.props.id);
                });
            }
            if (prevChildren) {
                prevChildren.forEach((prevChild) => {
                    // Hide elements that are removed
                    if (!handledIds.includes(prevChild.props.id)) {
                        newAnimations.push({
                            id: prevChild.props.id,
                            fadePositions: [
                                {
                                    fadePosition: 0,
                                    attributes: {
                                        opacity: 1.0,
                                        size: prevChild.props.size,
                                    },
                                },
                                {
                                    fadePosition: 0.5,
                                    attributes: {
                                        opacity: 0.0,
                                        size: { width: 0, height: 0 },
                                    },
                                },
                                {
                                    fadePosition: 1,
                                    attributes: {
                                        opacity: 0.0,
                                        size: { width: 0, height: 0 },
                                    },
                                },
                            ],
                        });
                    }
                });
            }
            setAnimationFader(0);
        } else {
            setAnimationFader(1);
        }
        setAnimations(newAnimations);
        setPreviousChildren(prevChildren);
        setPreviousSize(prevSize);
        setPreviousId(id);
    }, [children, size]);

    const handleAnimationStep = React.useCallback(() => {
        setAnimationFader(Math.min(1, animationFader + 0.02));
    }, [animationFader]);

    React.useEffect(() => {
        const animationInterval = setInterval(() => {
            handleAnimationStep();
        }, 10);

        return () => {
            clearInterval(animationInterval);
        };
    }, [handleAnimationStep]);

    if (!centerPoint || !viewSize) {
        return <></>;
    }

    const calculatedSize = previousSize
        ? {
              width: animationFader <= 0.5 ? previousSize.width : size.width,
              height: animationFader <= 0.5 ? previousSize.height : size.height,
          }
        : size;

    return (
        <div className="Scene" style={{ width: calculatedSize.width, height: calculatedSize.height }}>
            {animationFader < 1 &&
                previousChildren &&
                previousChildren.map((child: React.ReactElement<SceneItemPropsType>) => {
                    if (!children || !children.find((el) => el.props.id === child.props.id)) {
                        const animation = animations.find((el) => el.id === child.props.id);
                        return React.cloneElement(child, {
                            viewCenterPoint: centerPoint,
                            viewSize: calculatedSize,
                            onClick: onNodeClick ? (id: string) => onNodeClick(id) : undefined,
                            onMouseEnter: onNodeEnter,
                            onMouseLeave: onNodeLeave,
                            animation: animation,
                            animationFade: animationFader,
                        });
                    } else {
                        return <></>;
                    }
                })}
            {children &&
                children.map((child: React.ReactElement<SceneItemPropsType>) => {
                    const animation = animations.find((el) => el.id === child.props.id);
                    return React.cloneElement(child, {
                        viewCenterPoint: centerPoint,
                        viewSize: viewSize,
                        onClick: onNodeClick ? (id: string) => onNodeClick(id) : undefined,
                        onMouseEnter: onNodeEnter,
                        onMouseLeave: onNodeLeave,
                        animation: animation,
                        animationFade: animationFader,
                    });
                })}
        </div>
    );
});
