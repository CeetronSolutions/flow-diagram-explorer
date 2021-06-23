import React from "react";
import dayjs, { Dayjs } from "dayjs";

import { DiagramDrawer, Diagram } from "../../utils/diagram-drawer";
import { Scene } from "../Scene";
import { Map } from "../Map";
import { FlowDiagram } from "../../types/diagram";
import { DiagramSkeleton } from "../DiagramSkeleton/diagram-skeleton";
import { Breadcrumbs } from "@equinor/eds-core-react";
import { DiagramConfig } from "../../types/diagram";
import { Timeline } from "../Timeline";

import "./flow-diagram-explorer.css";
import { DateTimeHandler } from "../DateTimeHandler";
import { DiagramReducer, DiagramReducerInit, DiagramActionTypes } from "../DiagramReducer/diagram-reducer";

const defaultDiagramConfig: DiagramConfig = {
    horizontalSpacing: 80,
    verticalSpacing: 50,
    highlightColor: "#DF323D",
    backgroundColor: "#F7F7F7",
    defaultEdgeStrokeWidth: 2,
    defaultEdgeArrowSize: 16,
    defaultEdgeStrokeColor: "#000",
    defaultEdgeStrokeStyle: "0",
};

type FlowDiagramExplorerPropsType = {
    flowDiagram: FlowDiagram | FlowDiagram[];
    diagramConfig?: DiagramConfig;
    onNodeClick?: (nodeId: string) => void;
    onDiagramChange?: (title: string) => void;
};

export const DiagramConfigContext = React.createContext<DiagramConfig>(defaultDiagramConfig);

const FlowDiagramExplorer: React.FC<FlowDiagramExplorerPropsType> = (props) => {
    const diagramConfig = props.diagramConfig || defaultDiagramConfig;
    const flowDiagrams = Array.isArray(props.flowDiagram) ? props.flowDiagram : [props.flowDiagram];
    const [levels, setLevels] = React.useState<{ id: string; title: string }[]>([]);

    const [state, dispatch] = React.useReducer(
        DiagramReducer,
        { flowDiagrams: flowDiagrams, diagramConfig: diagramConfig },
        DiagramReducerInit
    );

    return (
        <div className="FlowDiagramExplorer">
            <DiagramConfigContext.Provider value={diagramConfig}>
                {flowDiagrams.length > 0 ? (
                    <>
                        <div className="Levels">
                            <Breadcrumbs>
                                {levels.map((level, index, array) => {
                                    if (index === array.length - 1) {
                                        return (
                                            <Breadcrumbs.Breadcrumb
                                                key={level.id}
                                                href="#"
                                                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
                                            >
                                                {level.title}
                                            </Breadcrumbs.Breadcrumb>
                                        );
                                    } else {
                                        return (
                                            <Breadcrumbs.Breadcrumb
                                                href="#"
                                                onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                                                    dispatch({
                                                        type: DiagramActionTypes.MoveUpToNode,
                                                        payload: {
                                                            nodeId: level.id,
                                                        },
                                                    })
                                                }
                                            >
                                                {level.title}
                                            </Breadcrumbs.Breadcrumb>
                                        );
                                    }
                                })}
                            </Breadcrumbs>
                        </div>
                        <DateTimeHandler
                            flowDiagrams={flowDiagrams}
                            globalTimeRange={{
                                startDateTime: dayjs(flowDiagrams[0].startDate),
                                endDateTime: dayjs(flowDiagrams[0].endDate),
                            }}
                            onNodeClick={props.onNodeClick}
                        />
                    </>
                ) : (
                    <DiagramSkeleton />
                )}
            </DiagramConfigContext.Provider>
        </div>
    );
};

export default FlowDiagramExplorer;
