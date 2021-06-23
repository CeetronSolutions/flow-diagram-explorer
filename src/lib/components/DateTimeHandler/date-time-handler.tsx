import React from "react";
import dayjs, { Dayjs } from "dayjs";

import { DiagramDrawer, Diagram } from "../../utils/diagram-drawer";
import { FlowDiagram } from "../../types/diagram";
import { Scene } from "../Scene";
import { Map } from "../Map";
import { NodeActionHandler } from "../NodeActionHandler";
import { Timeline } from "../Timeline";
import { DiagramConfigContext } from "../FlowDiagramExplorer/flow-diagram-explorer";
import { DiagramSkeleton } from "../DiagramSkeleton/diagram-skeleton";

type DateTimeHandlerProps = {
    flowDiagrams: FlowDiagram[];
    initialDateTime?: Dayjs | null;
    globalTimeRange: { startDateTime: Dayjs; endDateTime: Dayjs };
    onNodeClick?: (nodeId: string) => void;
};

export const DateTimeHandler: React.FC<DateTimeHandlerProps> = (props) => {
    const { flowDiagrams, globalTimeRange } = props;

    const [currentDate, setCurrentDate] = React.useState<Dayjs | null>(null);
    const [sortedFlowDiagrams, setSortedFlowDiagrams] = React.useState<
        { id: string; startDateTime: Dayjs; endDateTime: Dayjs; diagram: Diagram }[]
    >([]);
    const [currentFlowDiagram, setCurrentFlowDiagram] = React.useState(0);

    const diagramConfig = React.useContext(DiagramConfigContext);

    React.useEffect(() => {
        const newSortedFlowDiagrams = flowDiagrams
            .sort(
                (a: FlowDiagram, b: FlowDiagram): number => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()
            )
            .map((el) => {
                const drawer = new DiagramDrawer(el, diagramConfig);
                return {
                    id: el.id,
                    startDateTime: el.startDate ? dayjs(el.startDate) : globalTimeRange.startDateTime,
                    endDateTime: el.endDate ? dayjs(el.endDate) : globalTimeRange.endDateTime,
                    diagram: drawer.diagram(),
                };
            });
        setSortedFlowDiagrams(newSortedFlowDiagrams);
    }, [flowDiagrams]);

    const handleDateChange = React.useCallback(
        (date: Dayjs) => {
            setCurrentDate(date);
            setCurrentFlowDiagram(
                sortedFlowDiagrams.findIndex((el) => {
                    if (date.isBetween(el.startDateTime, el.endDateTime, null, "[]")) {
                        return true;
                    }
                    return false;
                }) || 0
            );
        },
        [setCurrentDate, sortedFlowDiagrams, setCurrentFlowDiagram]
    );

    if (sortedFlowDiagrams[currentFlowDiagram]) {
        return (
            <>
                <div className="TimelineContainer">
                    <Timeline
                        onDateChange={handleDateChange}
                        initialDate={currentDate}
                        timeFrames={sortedFlowDiagrams.map((el) => ({
                            id: el.id,
                            startDate: el.startDateTime,
                            endDate: el.endDateTime,
                        }))}
                    />
                </div>
                <Map
                    Scene={
                        <NodeActionHandler sceneProperties={sortedFlowDiagrams[currentFlowDiagram].diagram}>
                            <Scene
                                id={
                                    sortedFlowDiagrams.length > currentFlowDiagram
                                        ? sortedFlowDiagrams[currentFlowDiagram].id
                                        : ""
                                }
                                size={sortedFlowDiagrams[currentFlowDiagram].diagram.sceneSize}
                                onNodeClick={props.onNodeClick || undefined}
                            >
                                {sortedFlowDiagrams[currentFlowDiagram].diagram.sceneItems}
                            </Scene>
                        </NodeActionHandler>
                    }
                    width="100%"
                    height="95vh"
                    sceneSize={sortedFlowDiagrams[currentFlowDiagram].diagram.sceneSize}
                    id={sortedFlowDiagrams.length > currentFlowDiagram ? sortedFlowDiagrams[currentFlowDiagram].id : ""}
                    config={diagramConfig}
                />
            </>
        );
    } else {
        return <DiagramSkeleton />;
    }
};
