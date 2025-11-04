declare module 'react-plotly.js' {
    import { Component } from 'react';

    export interface PlotParams {
        data: any[];
        layout?: any;
        config?: any;
        frames?: any[];
        onInitialized?: (figure: any, graphDiv: any) => void;
        onUpdate?: (figure: any, graphDiv: any) => void;
        divId?: string;
        className?: string;
        style?: React.CSSProperties;
        useResizeHandler?: boolean;
    }

    export default class Plot extends Component<PlotParams> {}
}
