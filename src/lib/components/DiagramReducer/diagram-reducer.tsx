import dayjs, { Dayjs } from "dayjs";
import { FlowDiagram, DiagramConfig } from "../../types/diagram";
import { Diagram, DiagramDrawer } from "../../utils/diagram-drawer";

type ActionMap<M extends { [index: string]: { [key: string]: string | Dayjs | number } }> = {
    [Key in keyof M]: M[Key] extends undefined
        ? {
              type: Key;
          }
        : {
              type: Key;
              payload: M[Key];
          };
};

export enum DiagramActionTypes {
    MoveDown = "MOVE_DOWN",
    MoveUpToNode = "MOVE_UP_TO_NODE",
    ChangeDate = "CHANGE_DATE",
}

type DiagramReducerStateType = {
    fixed: {
        flowDiagrams: FlowDiagram[];
        diagramConfig: DiagramConfig;
        globalStartDate: Dayjs;
        globalEndDate: Dayjs;
    };
    currentPath: string[];
    currentDate: Dayjs;
    currentDiagram?: Diagram;
};

type Payload = {
    [DiagramActionTypes.MoveDown]: {
        id: string;
    };
    [DiagramActionTypes.MoveUpToNode]: {
        nodeId: string;
    };
    [DiagramActionTypes.ChangeDate]: {
        date: Dayjs;
    };
};

type Actions = ActionMap<Payload>[keyof ActionMap<Payload>];

export const DiagramReducerInit = ({
    flowDiagrams,
    diagramConfig,
}: {
    flowDiagrams: FlowDiagram[];
    diagramConfig: DiagramConfig;
}): DiagramReducerStateType => {
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    let id = "";
    let diagram: Diagram | undefined = undefined;

    if (flowDiagrams.length > 0) {
        id = flowDiagrams[0].id;
        startDate = flowDiagrams[0].startDate;
        endDate = flowDiagrams[0].endDate;

        flowDiagrams.forEach((diagram) => {
            if (diagram.startDate && (!startDate || dayjs(diagram.startDate).isBefore(dayjs(startDate)))) {
                startDate = diagram.startDate;
            }
            if (diagram.endDate && (!endDate || dayjs(diagram.endDate).isAfter(dayjs(endDate)))) {
                endDate = diagram.endDate;
            }
        });
        const diagramDrawer = new DiagramDrawer(flowDiagrams[0], diagramConfig);
        diagram = diagramDrawer.diagram();
    }
    return {
        fixed: {
            flowDiagrams: flowDiagrams,
            diagramConfig: diagramConfig,
            globalStartDate: dayjs(startDate),
            globalEndDate: dayjs(endDate),
        },
        currentPath: [id],
        currentDate: dayjs(startDate),
        currentDiagram: diagram,
    };
};

const findAndCreateDiagram = (
    flowDiagrams: FlowDiagram[],
    date: Dayjs,
    path: string[],
    diagramConfig: DiagramConfig
): Diagram | undefined => {
    let currentDiagram = flowDiagrams.find((el) => date.isBetween(dayjs(el.startDate), dayjs(el.endDate), null, "[]"));
    path.forEach((id, index) => {
        if (index > 0 && currentDiagram) {
            const node = currentDiagram.nodes.find((el) => el.id === id);
            if (node && node.subdiagram) {
                let subdiagrams: FlowDiagram[] = [];
                if (Array.isArray(node.subdiagram)) {
                    subdiagrams = node.subdiagram;
                } else {
                    subdiagrams = [node.subdiagram];
                }
                currentDiagram = subdiagrams.find((el) =>
                    date.isBetween(dayjs(el.startDate), dayjs(el.endDate), null, "[]")
                );
            }
        }
    });
    const diagramDrawer = currentDiagram ? new DiagramDrawer(currentDiagram, diagramConfig) : undefined;
    return diagramDrawer?.diagram();
};

export const DiagramReducer = (state: DiagramReducerStateType, action: Actions): DiagramReducerStateType => {
    switch (action.type) {
        case DiagramActionTypes.MoveDown: {
            // Find child node with id and create and set new diagram
            const newPath = [...state.currentPath, action.payload.id];
            const diagram = findAndCreateDiagram(
                state.fixed.flowDiagrams,
                state.currentDate,
                newPath,
                state.fixed.diagramConfig
            );
            return {
                ...state,
                currentPath: newPath,
                currentDiagram: diagram,
            };
            break;
        }
        case DiagramActionTypes.MoveUpToNode: {
            // Search for new id in path and create and set new diagram
            const newPath = state.currentPath.reduce((reducedPath: string[], id: string) => {
                if (reducedPath.length === 0 || reducedPath[reducedPath.length - 1] !== id) {
                    reducedPath.push(id);
                }
                return reducedPath;
            }, []);

            const diagram = findAndCreateDiagram(
                state.fixed.flowDiagrams,
                state.currentDate,
                newPath,
                state.fixed.diagramConfig
            );
            return {
                ...state,
                currentPath: newPath,
                currentDiagram: diagram,
            };
            break;
        }
        case DiagramActionTypes.ChangeDate: {
            // Check if the current diagram contains the given date or find new diagram on same level which contains the given date
            const diagram = findAndCreateDiagram(
                state.fixed.flowDiagrams,
                action.payload.date,
                state.currentPath,
                state.fixed.diagramConfig
            );
            return {
                ...state,
                currentDate: action.payload.date,
                currentDiagram: diagram,
            };
            break;
        }
    }
};
