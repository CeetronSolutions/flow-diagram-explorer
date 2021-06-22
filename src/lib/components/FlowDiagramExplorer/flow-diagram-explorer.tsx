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
import { NodeActionHandler } from "../NodeActionHandler";

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
    const [date, setDate] = React.useState<Dayjs | null>(null);
    const [sortedFlowDiagrams, setSortedFlowDiagrams] = React.useState<FlowDiagram[]>([]);
    const [currentFlowDiagram, setCurrentFlowDiagram] = React.useState(0);
    const [timeFrames, setTimeFrames] = React.useState<{ id: string; fromDate: Dayjs; toDate: Dayjs }[]>([]);
    const [levels, setLevels] = React.useState<{ id: string; title: string; diagram: Diagram }[]>([]);
    const [sceneProperties, setSceneProperties] = React.useState<Diagram | null>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (Array.isArray(props.flowDiagram) && props.flowDiagram.length > 0 && props.flowDiagram[0].startDate) {
            const newSortedFlowDiagrams = props.flowDiagram.sort(
                (a: FlowDiagram, b: FlowDiagram): number => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()
            );
            setSortedFlowDiagrams(newSortedFlowDiagrams);

            if (
                date === null ||
                date.isBefore(dayjs(newSortedFlowDiagrams[0].startDate)) ||
                date.isAfter(dayjs(newSortedFlowDiagrams[newSortedFlowDiagrams.length - 1].endDate))
            ) {
                setDate(dayjs(props.flowDiagram[0].startDate));
            }

            const timeFrames: { id: string; fromDate: Dayjs; toDate: Dayjs }[] = [];

            newSortedFlowDiagrams.forEach((el) => {
                timeFrames.push({ id: el.id, fromDate: dayjs(el.startDate), toDate: dayjs(el.endDate) });
            });
            setTimeFrames(timeFrames);
        } else if (!Array.isArray(props.flowDiagram)) {
            setSortedFlowDiagrams([props.flowDiagram]);
            setTimeFrames([]);
        }
        setCurrentFlowDiagram(0);
    }, [props.flowDiagram, setTimeFrames, setSortedFlowDiagrams, setDate]);

    React.useEffect(() => {
        if (
            Array.isArray(props.flowDiagram) &&
            props.flowDiagram.length > 0 &&
            props.flowDiagram[0].startDate &&
            date
        ) {
            setCurrentFlowDiagram(
                sortedFlowDiagrams.findIndex((el) => date.isBetween(dayjs(el.startDate), dayjs(el.endDate), null, "[]"))
            );
        }
    }, [date]);

    React.useEffect(() => {
        const flowDiagram = Array.isArray(props.flowDiagram)
            ? props.flowDiagram[currentFlowDiagram]
            : props.flowDiagram;
        const drawer = new DiagramDrawer(flowDiagram, diagramConfig);
        setSceneProperties(drawer.diagram());
        const index = levels.findIndex((el) => el.id === flowDiagram.id);
        if (index === -1) {
            setLevels([...levels, { id: flowDiagram.id, title: flowDiagram.title, diagram: drawer.diagram() }]);
        } else if (index === 0) {
            setLevels([{ id: flowDiagram.id, title: flowDiagram.title, diagram: drawer.diagram() }]);
        }
    }, [props.flowDiagram, diagramConfig, currentFlowDiagram]);

    const handleLevelClicked = (
        e: React.MouseEvent<HTMLAnchorElement>,
        level: { id: string; title: string; diagram: Diagram }
    ) => {
        const index = levels.findIndex((el) => el.title === level.title);
        setLevels(levels.filter((_, idx) => idx <= index));
        if (props.onDiagramChange) {
            props.onDiagramChange(level.id);
        }
        e.preventDefault();
    };

    const handleDateChange = React.useCallback(
        (date: Dayjs) => {
            setDate(date);
        },
        [setDate]
    );

    return (
        <div className="FlowDiagramExplorer" ref={mapRef}>
            <DiagramConfigContext.Provider value={diagramConfig}>
                {sceneProperties !== null ? (
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
                                                    handleLevelClicked(e, level)
                                                }
                                            >
                                                {level.title}
                                            </Breadcrumbs.Breadcrumb>
                                        );
                                    }
                                })}
                            </Breadcrumbs>
                        </div>
                        <div className="TimelineContainer">
                            <Timeline onDateChange={handleDateChange} timeFrames={timeFrames} />
                        </div>
                        <Map
                            Scene={
                                <NodeActionHandler sceneProperties={sceneProperties}>
                                    <Scene
                                        id={
                                            sortedFlowDiagrams.length > currentFlowDiagram
                                                ? sortedFlowDiagrams[currentFlowDiagram].id
                                                : ""
                                        }
                                        size={sceneProperties.sceneSize}
                                        onNodeClick={props.onNodeClick || undefined}
                                        level={levels.length}
                                    >
                                        {sceneProperties.sceneItems}
                                    </Scene>
                                </NodeActionHandler>
                            }
                            width="100%"
                            height="95vh"
                            sceneSize={sceneProperties.sceneSize}
                            id={
                                sortedFlowDiagrams.length > currentFlowDiagram
                                    ? sortedFlowDiagrams[currentFlowDiagram].id
                                    : ""
                            }
                            config={diagramConfig}
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
