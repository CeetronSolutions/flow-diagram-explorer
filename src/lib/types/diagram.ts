import { Size } from "./size";
import { Point } from "./point";

export interface FlowDiagram {
    id: string;
    title: string;
    startDate?: string;
    endDate?: string;
    nodes: FlowDiagramNode[];
    flows: FlowDiagramFlow[];
    edges: FlowDiagramEdge[];
}

export type RenderFunctions = {
    [key: string]: (node: FlowDiagramNode) => { html: JSX.Element; width: number; height: number };
};

export type FlowStyles = {
    [key: string]: { strokeColor?: string; strokeStyle?: string; strokeWidth?: number; arrowHeadSize?: number };
};

export type FlowDiagramFlow = {
    id: string;
    label: string;
    type?: string;
};

export type FlowDiagramEdge = {
    flow: string;
    fromNode: string;
    toNode: string;
};

export type FlowDiagramNode = {
    id: string;
    type?: string;
    title?: string;
    icon?: string;
    subdiagram?: FlowDiagram | FlowDiagram[];
};

export enum DiagramLayout {
    LeftRight = "LR",
    RightLeft = "RL",
    TopBottom = "TB",
    BottomTop = "BT",
}

export type DiagramConfig = {
    horizontalSpacing: number;
    verticalSpacing: number;
    highlightColor: string;
    backgroundColor: string;
    defaultEdgeStrokeWidth: number;
    defaultEdgeArrowSize: number;
    defaultEdgeStrokeColor: string;
    defaultEdgeStrokeStyle: string;
    defaultRenderFunction: (node: FlowDiagramNode) => { html: JSX.Element; width: number; height: number };
    layout: DiagramLayout;
};

export type NodeElement = {
    id: string;
    centerPosition: Point;
    size: Size;
    html: JSX.Element;
};

export type ArrowElement = {
    flow: FlowDiagramFlow;
    points: Point[];
    label: string;
    labelPosition: Point;
};
