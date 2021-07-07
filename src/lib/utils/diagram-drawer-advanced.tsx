import React from "react";
import dagre, { Edge, GraphEdge } from "dagre";

import { FlowDiagram, FlowDiagramNode } from "../types/diagram";
import { DiagramConfig } from "../types/diagram";
import { Size } from "../types/size";
import { SceneItem, SceneItemPropsType, SceneItemType } from "../components/SceneItem";
import { EdgeLabel } from "../components/EdgeLabel";
import { Point } from "../types/point";
import { DebugConsole } from "./debug";
import { pointDistance, pointSum, pointScale } from "./geometry";

type NodeFlowEdgeMap = {
    node: string;
    sourceNodes: string[];
    targetNodes: string[];
    flow: string;
};

enum EdgeLayer {
    Source = 0,
    JointSplit,
    Target,
}

type AdditionalFlowNodesMapItem = { sourceNodes: string[]; targetNodes: string[]; edgeId: string };
type FlowNodeEdgeIndicesMapItem = { id: string; edgeIndices: number[] };
type AdjustedPoint = { startNode: string; position: Point };
type RankNodeItem = { rank: number; nodes: string[] };
type EdgePointsItem = { id: string; flow: string; points: Point[]; layer: EdgeLayer; rank: number };

export type Diagram = {
    sceneItems: React.ReactElement<SceneItemPropsType>[];
    sceneSize: Size;
    flowNodeEdgeMap: { id: string; edgeIndices: number[] }[];
};

export class DiagramDrawer {
    private flowDiagram: FlowDiagram;
    private config: DiagramConfig;
    private renderJointNode = (): { html: JSX.Element; width: number; height: number } => {
        return {
            html: (
                <div
                    style={{
                        width: 10,
                        height: 10,
                        backgroundColor: "#000",
                    }}
                ></div>
            ),
            width: 10,
            height: 10,
        };
    };
    private renderDefaultNode = (node: FlowDiagramNode): { html: JSX.Element; width: number; height: number } => {
        return {
            html: (
                <div
                    style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#ccc",
                        border: "1px black solid",
                        width: "200px",
                        height: "100px",
                        marginTop: "-50px",
                        marginLeft: "-100px",
                    }}
                >
                    {node.title}
                </div>
            ),
            width: 200,
            height: 100,
        };
    };
    private additionalFlowNodes: string[];
    private additionalFlowNodesMap: AdditionalFlowNodesMapItem[];
    private flowNodeEdgeIndicesMap: FlowNodeEdgeIndicesMapItem[];
    private sceneItems: React.ReactElement<SceneItemPropsType>[];
    private sceneSize: Size;
    private rankNodeMap: RankNodeItem[];
    private numRanks: number;
    private edgePoints: EdgePointsItem[];

    constructor(flowDiagram: FlowDiagram, config: DiagramConfig) {
        this.flowDiagram = flowDiagram;
        this.config = config;
        this.sceneItems = [];
        this.additionalFlowNodes = [];
        this.additionalFlowNodesMap = [];
        this.flowNodeEdgeIndicesMap = [];
        this.sceneSize = { width: 0, height: 0 };
        this.rankNodeMap = [];
        this.numRanks = 0;
        this.edgePoints = [];
    }

    private compareNodeArrays(array1: string[], array2: string[]): boolean {
        if (array1.length !== array2.length) {
            return false;
        }
        const newArray2 = [...array2];
        array1.forEach((value) => {
            const index = newArray2.indexOf(value, 0);
            if (index !== -1) {
                newArray2.splice(index, 1);
            }
        });
        return newArray2.length === 0;
    }

    private sortNodesByYCoordinate(
        nodeA: { node: string; position: Point },
        nodeB: { node: string; position: Point }
    ): number {
        return nodeA.position.y - nodeB.position.y;
    }

    private makeAdditionalFlowNodes(graph: dagre.graphlib.Graph): void {
        this.flowDiagram.edges.forEach((edge) => {
            graph.setEdge(
                `${edge.from}`,
                `${edge.to}`,
                { label: edge.flow, width: 300, height: 10, labelpos: "l", labeloffset: 12 },
                edge.flow
            );
        });
    }

    private makeGraph(): dagre.graphlib.Graph {
        const graph = new dagre.graphlib.Graph({ multigraph: true });
        graph.setGraph({ rankdir: "LR", ranksep: this.config.horizontalSpacing, nodesep: this.config.verticalSpacing });

        this.flowDiagram.nodes.forEach((node) => {
            const nodeMeta = node.render ? node.render(node) : this.renderDefaultNode(node);
            graph.setNode(node.id, { label: node.title, width: nodeMeta.width, height: nodeMeta.height });
        });

        this.makeAdditionalFlowNodes(graph);

        dagre.layout(graph, {
            rankdir: "LR",
        });

        return graph;
    }

    private makeNodes(graph: dagre.graphlib.Graph): void {
        graph.nodes().forEach((v) => {
            const node = this.flowDiagram.nodes.find((node) => node.id === v) || {
                id: v,
                render: this.renderJointNode,
            };
            const { html, width, height } = node.render ? node.render(node) : this.renderDefaultNode(node);
            this.sceneItems.push(
                <SceneItem
                    key={v}
                    id={v}
                    type={SceneItemType.Node}
                    size={{ width: width, height: height }}
                    position={{ x: graph.node(v).x, y: graph.node(v).y }}
                    zIndex={8}
                    children={html}
                    clickable={true}
                    hoverable={true}
                />
            );
        });
    }

    private makeRankNodeMap(graph: dagre.graphlib.Graph): void {
        const sortedNodes = graph.nodes().sort((a: string, b: string) => graph.node(a).x - graph.node(b).x);
        const positionRankMap: { x: number; rank: number }[] = [];
        let rank = 0;
        sortedNodes.forEach((node) => {
            const positionRank = positionRankMap.find((el) => el.x === graph.node(node).x);
            if (!positionRank) {
                positionRankMap.push({ x: graph.node(node).x, rank: rank });
                this.rankNodeMap.push({ rank: rank, nodes: [node] });
                this.numRanks = rank + 1;
                rank++;
            } else {
                const rankNodeMapItem = this.rankNodeMap.find((el) => el.rank === positionRank.rank);
                if (rankNodeMapItem) {
                    rankNodeMapItem.nodes.push(node);
                }
            }
        });
    }

    private makeEdgeId(from: string, to: string, flow: string, layer: EdgeLayer): string {
        const layerStringMap = new Map<number, string>([
            [EdgeLayer.Source, "Source"],
            [EdgeLayer.JointSplit, "JointSplit"],
            [EdgeLayer.Target, "Target"],
        ]);
        return `${flow}:${from}-${to}:${layerStringMap.get(layer)}`;
    }

    private makeUniqueFlowEdges(edges: dagre.Edge[] | undefined): dagre.Edge[] | undefined {
        return (
            edges &&
            edges.reduce((reducedEdges: dagre.Edge[], edge: dagre.Edge) => {
                if (!reducedEdges.find((el) => el.name === edge.name)) {
                    reducedEdges.push(edge);
                }
                return reducedEdges;
            }, [])
        );
    }

    private makeEdgePoints(graph: dagre.graphlib.Graph): void {
        this.makeRankNodeMap(graph);
        const deltaLayerPositions = this.config.horizontalSpacing / 4;
        for (let rank = 0; rank < this.numRanks - 1; rank++) {
            const nodes = this.rankNodeMap.find((el) => el.rank === rank);
            if (nodes) {
                const nextRankNodes = this.rankNodeMap.find((el) => el.rank === rank + 1);
                let nextRankXPosition = 0;
                if (nextRankNodes) {
                    nextRankXPosition = Math.min(
                        ...nextRankNodes.nodes.map((el) => graph.node(el).x - graph.node(el).width / 2)
                    );
                }

                // First layer: edges leaving nodes and possibly uniting flows
                const flows: string[] = [];
                let xStartPosition = 0;
                nodes.nodes.forEach((node) => {
                    const outEdges = this.makeUniqueFlowEdges(graph.outEdges(node));
                    if (outEdges) {
                        const localFlows = outEdges.reduce((reducedFlows: string[], el) => {
                            if (el.name && !reducedFlows.includes(el.name)) {
                                reducedFlows.push(el.name);
                            }
                            return reducedFlows;
                        }, []);
                        localFlows.forEach((localFlow) => {
                            if (!flows.includes(localFlow)) {
                                flows.push(localFlow);
                            }
                        });
                    }
                    xStartPosition = Math.max(xStartPosition, graph.node(node).x + graph.node(node).width / 2);
                });
                const deltaLayerPositions = (nextRankXPosition - xStartPosition) / 4;
                nodes.nodes.forEach((node) => {
                    const outEdges = this.makeUniqueFlowEdges(graph.outEdges(node));
                    if (outEdges) {
                        const upperRightCorner = {
                            x: graph.node(node).x + graph.node(node).width / 2,
                            y: graph.node(node).y - graph.node(node).height / 2,
                        };
                        outEdges.forEach((edge, index) => {
                            const startPoint = pointSum(upperRightCorner, {
                                x: 0,
                                y: ((index + 1) * graph.node(node).height) / (outEdges.length + 1),
                            });
                            const flow = this.flowDiagram.flows.find((flow) => flow.id === edge.name);
                            if (flow) {
                                const flowIndex = flows.findIndex((el) => el === flow.id) || 0;

                                const endPoint = pointSum(
                                    { x: xStartPosition, y: upperRightCorner.y },
                                    {
                                        x: ((flowIndex + 1) / flows.length) * deltaLayerPositions,
                                        y: ((index + 1) * graph.node(node).height) / (outEdges.length + 1),
                                    }
                                );

                                const id = this.makeEdgeId(edge.v, edge.w, flow.id, EdgeLayer.Source);
                                const edgePointItem = this.edgePoints.find(
                                    (el) => el.id === id && el.layer === EdgeLayer.Source
                                );
                                if (edgePointItem) {
                                    edgePointItem.points.push(startPoint);
                                    edgePointItem.points.push(endPoint);
                                } else {
                                    this.edgePoints.push({
                                        id: id,
                                        points: [startPoint, endPoint],
                                        flow: flow.id,
                                        layer: EdgeLayer.Source,
                                        rank: rank,
                                    });
                                }
                            }
                        });
                    }
                });

                // First layer: joining flows
                flows.forEach((flow) => {
                    const otherFlowEdgePoints = this.edgePoints.reduce(
                        (reduced: EdgePointsItem[], el: EdgePointsItem) => {
                            if (el.rank === rank && el.flow === flow && el.layer === EdgeLayer.Source) {
                                reduced.push(el);
                            }
                            return reduced;
                        },
                        []
                    );
                    const jointPoint = this.calcAveragePoint(
                        otherFlowEdgePoints.map((el) => el.points[el.points.length - 1])
                    );
                    otherFlowEdgePoints.forEach((el) => el.points.push(jointPoint));
                });

                // Third layer: edges arriving at nodes
                if (nextRankNodes) {
                    nextRankNodes.nodes.forEach((node) => {
                        const inEdges = this.makeUniqueFlowEdges(graph.inEdges(node));
                        if (inEdges) {
                            const upperLeftCorner = {
                                x: graph.node(node).x - graph.node(node).width / 2,
                                y: graph.node(node).y - graph.node(node).height / 2,
                            };
                            inEdges.forEach((edge, index) => {
                                const endPoint = pointSum(upperLeftCorner, {
                                    x: 0,
                                    y: ((index + 1) * graph.node(node).height) / (inEdges.length + 1),
                                });
                                const flow = this.flowDiagram.flows.find((flow) => flow.id === edge.name);
                                if (flow) {
                                    const flowIndex = flows.findIndex((el) => el === flow.id) || 0;

                                    const startPoint = pointSum(
                                        { x: nextRankXPosition, y: upperLeftCorner.y },
                                        {
                                            x: -((flowIndex + 1) / flows.length) * deltaLayerPositions,
                                            y: ((index + 1) * graph.node(node).height) / (inEdges.length + 1),
                                        }
                                    );

                                    const id = this.makeEdgeId(edge.v, edge.w, flow.id, EdgeLayer.Target);
                                    const edgePointItem = this.edgePoints.find(
                                        (el) => el.id === id && el.layer === EdgeLayer.Target
                                    );
                                    if (edgePointItem) {
                                        edgePointItem.points.push(startPoint);
                                        edgePointItem.points.push(endPoint);
                                    } else {
                                        this.edgePoints.push({
                                            id: id,
                                            points: [startPoint, endPoint],
                                            flow: flow.id,
                                            layer: EdgeLayer.Target,
                                            rank: rank,
                                        });
                                    }
                                }
                            });
                        }
                    });
                }

                // Third layer: splitting flows
                flows.forEach((flow) => {
                    const otherFlowEdgePoints = this.edgePoints.reduce(
                        (reduced: EdgePointsItem[], el: EdgePointsItem) => {
                            if (el.rank === rank && el.flow === flow && el.layer === EdgeLayer.Target) {
                                reduced.push(el);
                            }
                            return reduced;
                        },
                        []
                    );
                    const jointPoint = this.calcAveragePoint(otherFlowEdgePoints.map((el) => el.points[0]));
                    otherFlowEdgePoints.forEach((el) => el.points.unshift(jointPoint));
                });
            }
        }
    }

    private calcAveragePoint(points: Point[]): Point {
        const averagePoint = { x: 0, y: 0 };
        points.forEach((point) => {
            averagePoint.x += point.x;
            averagePoint.y += point.y;
        });
        return pointScale(averagePoint, points.length);
    }

    private makeFlows(): void {
        this.flowDiagram.flows.forEach((flow) => {
            const arrowHeadSize = flow.style.arrowHeadSize || 9;
            const svg = (
                <svg width={this.sceneSize.width} height={this.sceneSize.height}>
                    <defs>
                        <marker
                            id={`arrow-${flow.id}`}
                            markerWidth={arrowHeadSize}
                            markerHeight={arrowHeadSize}
                            refX={arrowHeadSize - 1}
                            refY={arrowHeadSize / 3}
                            orient="auto"
                            markerUnits="strokeWidth"
                            viewBox={`0 0 ${arrowHeadSize} ${arrowHeadSize}`}
                        >
                            <path
                                d={`M0,0 L0,${(arrowHeadSize * 2) / 3} L${arrowHeadSize},${arrowHeadSize / 3} z`}
                                fill={flow.style.strokeColor}
                            />
                        </marker>
                        <marker
                            id={`arrow-${flow.id}-hover`}
                            markerWidth={arrowHeadSize}
                            markerHeight={arrowHeadSize}
                            refX={arrowHeadSize - 1}
                            refY={arrowHeadSize / 3}
                            orient="auto"
                            markerUnits="strokeWidth"
                            viewBox={`0 0 ${arrowHeadSize} ${arrowHeadSize}`}
                        >
                            <path
                                d={`M0,0 L0,${(arrowHeadSize * 2) / 3} L${arrowHeadSize},${arrowHeadSize / 3} z`}
                                fill={this.config.highlightColor}
                            />
                        </marker>
                    </defs>
                </svg>
            );
            this.sceneItems.push(
                <SceneItem
                    key={`${flow.id}-defs`}
                    id={`${flow.id}-defs`}
                    type={SceneItemType.Definition}
                    size={{ width: this.sceneSize.width, height: this.sceneSize.height }}
                    position={{ x: 0, y: 0 }}
                    zIndex={0}
                    children={svg}
                    clickable={false}
                />
            );
        });
    }

    private makeEdges(graph: dagre.graphlib.Graph): void {
        this.edgePoints.forEach((edge) => {
            const flow = this.flowDiagram.flows.find((flow) => flow.id === edge.flow);
            if (flow) {
                const strokeWidth = flow.style.strokeWidth || this.config.defaultEdgeStrokeWidth;
                const arrowWidth = flow.style.arrowHeadSize || this.config.defaultEdgeArrowSize;
                const strokeColor = flow.style.strokeColor || this.config.defaultEdgeStrokeColor;
                const strokeStyle = flow.style.strokeStyle || this.config.defaultEdgeStrokeStyle;
                const points = edge.points;
                const width =
                    Math.abs(Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))) +
                    2 * arrowWidth;
                const height =
                    Math.abs(Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))) +
                    2 * arrowWidth;
                const left = Math.min(...points.map((point) => point.x)) - arrowWidth;
                const top = Math.min(...points.map((point) => point.y)) - arrowWidth;
                const svg = (
                    <svg width={width} height={height} style={{ marginLeft: -width / 2, marginTop: -height / 2 }}>
                        <polyline
                            points={points.map((p) => `${p.x - left},${p.y - top}`).join(" ")}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeStyle}
                            markerEnd={edge.layer === EdgeLayer.Target ? `url(#arrow-${flow.id})` : undefined}
                        />
                    </svg>
                );
                this.sceneItems.push(
                    <SceneItem
                        key={`${edge.id}-edge`}
                        id={`edge-${edge.id}`}
                        type={SceneItemType.Flow}
                        size={{ width: width, height: height }}
                        position={{ x: left + width / 2, y: top + height / 2 }}
                        zIndex={2}
                        children={svg}
                        clickable={false}
                    />
                );
            }
        });
    }

    private makeSceneSize(graph: dagre.graphlib.Graph): void {
        this.sceneSize = {
            width: graph.graph().width ? (graph.graph().width as number) : 0,
            height: graph.graph().height ? (graph.graph().height as number) : 0,
        };
    }

    public makeDiagram(): void {
        const graph = this.makeGraph();

        this.makeSceneSize(graph);
        this.makeNodes(graph);
        this.makeFlows();
        this.makeEdgePoints(graph);
        this.makeEdges(graph);
    }

    public diagram(): Diagram {
        if (this.sceneItems.length === 0) {
            this.makeDiagram();
        }
        return {
            sceneItems: this.sceneItems,
            sceneSize: this.sceneSize,
            flowNodeEdgeMap: this.flowNodeEdgeIndicesMap,
        };
    }
}
