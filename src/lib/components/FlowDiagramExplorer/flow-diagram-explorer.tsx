import React from "react";
import { Dayjs } from "dayjs";
import { createMuiTheme } from "@material-ui/core";

import { Scene } from "../Scene";
import { Map } from "../Map";
import { FlowDiagram } from "../../types/diagram";
import { DiagramSkeleton } from "../DiagramSkeleton/diagram-skeleton";
import { Breadcrumbs } from "@equinor/eds-core-react";
import { DiagramConfig } from "../../types/diagram";
import { Timeline } from "../Timeline";
import { NodeActionHandler } from "../NodeActionHandler";

import "./flow-diagram-explorer.css";
import { DiagramReducer, DiagramReducerInit, DiagramActionTypes } from "../DiagramReducer/diagram-reducer";
import { MuiThemeProvider } from "@material-ui/core";

const customTheme = createMuiTheme({
    palette: {
        primary: {
            main: "#3e9299",
        },
    },
});

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
    animationsOn?: boolean;
    onNodeClick?: (nodeId: string) => void;
    onDiagramChange?: (title: string) => void;
};

export const DiagramConfigContext = React.createContext<DiagramConfig>(defaultDiagramConfig);

const FlowDiagramExplorer: React.FC<FlowDiagramExplorerPropsType> = (props) => {
    const diagramConfig = props.diagramConfig || defaultDiagramConfig;
    const animationsOn = props.animationsOn !== undefined ? props.animationsOn : false;
    const flowDiagrams = Array.isArray(props.flowDiagram) ? props.flowDiagram : [props.flowDiagram];

    const [state, dispatch] = React.useReducer(
        DiagramReducer,
        { flowDiagrams: flowDiagrams, diagramConfig: diagramConfig },
        DiagramReducerInit
    );

    return (
        <div className="FlowDiagramExplorer">
            <MuiThemeProvider theme={customTheme}>
                <DiagramConfigContext.Provider value={diagramConfig}>
                    {flowDiagrams.length > 0 ? (
                        <>
                            <div className="Levels">
                                <Breadcrumbs>
                                    {state.currentPath.map((pathElement, index, array) => {
                                        if (index === array.length - 1) {
                                            return (
                                                <Breadcrumbs.Breadcrumb
                                                    key={pathElement.id}
                                                    href="#"
                                                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                                                        e.preventDefault()
                                                    }
                                                >
                                                    {pathElement.title}
                                                </Breadcrumbs.Breadcrumb>
                                            );
                                        } else {
                                            return (
                                                <Breadcrumbs.Breadcrumb
                                                    key={pathElement.id}
                                                    href="#"
                                                    onClick={() =>
                                                        dispatch({
                                                            type: DiagramActionTypes.MoveUpToNode,
                                                            payload: {
                                                                nodeId: pathElement.id,
                                                            },
                                                        })
                                                    }
                                                >
                                                    {pathElement.title}
                                                </Breadcrumbs.Breadcrumb>
                                            );
                                        }
                                    })}
                                </Breadcrumbs>
                            </div>
                            <div className="TimelineContainer">
                                <Timeline
                                    onDateChange={(date: Dayjs) =>
                                        dispatch({ type: DiagramActionTypes.ChangeDate, payload: { date: date } })
                                    }
                                    initialDate={state.fixed.globalStartDate}
                                    timeFrames={state.currentPath[state.currentPath.length - 1].timeframes}
                                />
                            </div>
                            <Map
                                ActionHandler={
                                    <NodeActionHandler
                                        sceneProperties={state.currentDiagram}
                                        onNodeClick={(nodeId: string) =>
                                            dispatch({
                                                type: DiagramActionTypes.MoveDown,
                                                payload: { id: nodeId },
                                            })
                                        }
                                    ></NodeActionHandler>
                                }
                                Scene={
                                    <Scene
                                        id={state.currentPath[state.currentPath.length - 1].id}
                                        size={
                                            state.currentDiagram
                                                ? state.currentDiagram.sceneSize
                                                : { width: 0, height: 0 }
                                        }
                                        animationsOn={animationsOn}
                                        onNodeClick={
                                            props.onNodeClick
                                                ? props.onNodeClick
                                                : (nodeId: string) =>
                                                      dispatch({
                                                          type: DiagramActionTypes.MoveDown,
                                                          payload: { id: nodeId },
                                                      })
                                        }
                                    >
                                        {state.currentDiagram ? state.currentDiagram.sceneItems : []}
                                    </Scene>
                                }
                                width="100%"
                                height="95vh"
                                sceneSize={
                                    state.currentDiagram ? state.currentDiagram.sceneSize : { width: 0, height: 0 }
                                }
                                id={state.currentPath[state.currentPath.length - 1].id}
                                config={diagramConfig}
                            />
                        </>
                    ) : (
                        <DiagramSkeleton />
                    )}
                </DiagramConfigContext.Provider>
            </MuiThemeProvider>
        </div>
    );
};

export default FlowDiagramExplorer;
