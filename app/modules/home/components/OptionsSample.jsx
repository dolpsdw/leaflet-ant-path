import React, { PureComponent } from "react";
import AntPath from "react-leaflet-ant-path";
import L from "leaflet";
import "@elfalem/leaflet-curve";

import Map from "modules/ui/components/Map";
import { AppRoutesProvider } from "modules/core/index";
import Controls from "./Controls";
import CodeDemo from "./stateless/CodeDemo";
import HowToInstall from "./stateless/HowToInstall";
import { POLYLINE } from "../../../utils/vectors.constant";

const bounds = [
  { lat: -3.6436221426376605, lng: -38.44036247786476 },
  { lat: -3.809803653916078, lng: -38.60689613762902 }
];

export default class OptionsSample extends PureComponent {
  componentWillMount() {
    this.props.loadVector(POLYLINE);
  }

  render() {
    const {
      vectors,
      snippetType,
      options,
      changeSnippet,
      updateOptions,
      loadVector,
      resetOptions
    } = this.props;

    const latLngs = vectors[options.use] || null;

    return (
      <div className="options-sample">
        <div className="columns">
          <div className="column is-8">
            <div className="box">
              {latLngs ? (
                <Map latLngBounds={bounds}>
                  <AntPath
                    key={options.use}
                    positions={latLngs}
                    options={{ ...options, use: L[options.use] }}
                  />
                </Map>
              ) : null}
            </div>
          </div>
          <div className="column is-4">
            <div className="columns">
              <div className="container">
                <div className="column is-12">
                  <div className="box">
                    <Controls
                      options={options}
                      loadVector={loadVector}
                      updateOptions={updateOptions}
                      onReset={resetOptions}
                    />
                  </div>
                </div>

                <div className="column is-12">
                  <div className="box">
                    <AppRoutesProvider>
                      <HowToInstall />
                    </AppRoutesProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="columns">
          <div className="column is-12">
            <div className="box">
              <h1>
                <i className="fa fa-info-circle" /> Check the above example
                code:
              </h1>
              <CodeDemo
                type={snippetType}
                options={options}
                onClick={type => changeSnippet(type)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}