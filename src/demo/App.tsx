/**
 * Copyright (c) 2021- Equinor ASA
 *
 * This source code is licensed under the MPLv2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { installation, installation2 } from "./examples/installation";
import { FlowDiagramExplorer } from "../lib";

function App(): JSX.Element {
    return (
        <React.StrictMode>
            <FlowDiagramExplorer flowDiagram={[installation, installation2]} />
        </React.StrictMode>
    );
}

export default App;
