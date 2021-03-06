import React, { useState } from "react";
import { ChoroplethMap } from "../charts/ChoroplethMap";
import { Fips } from "../utils/madlib/Fips";
import styles from "./Card.module.scss";
import MapBreadcrumbs from "./MapBreadcrumbs";
import CardWrapper from "./CardWrapper";
import useDatasetStore from "../data/useDatasetStore";
import { MetricQuery } from "../data/MetricQuery";
import { MetricConfig } from "../data/MetricConfig";
import { CardContent } from "@material-ui/core";
import { Grid } from "@material-ui/core";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import Alert from "@material-ui/lab/Alert";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { Breakdowns, BreakdownVar } from "../data/Breakdowns";
import RaceInfoPopoverContent from "./ui/RaceInfoPopoverContent";
import { usePopover } from "../utils/usePopover";
import { Row } from "../data/DatasetTypes";

export interface MapCardProps {
  key?: string;
  fips: Fips;
  metricConfig: MetricConfig;
  nonstandardizedRace: boolean /* TODO- ideally wouldn't go here, could be calculated based on dataset */;
  updateFipsCallback: (fips: Fips) => void;
  enableFilter?: boolean;
  currentBreakdown: BreakdownVar | "all";
}

// This wrapper ensures the proper key is set to create a new instance when required (when the props change and the state needs to be reset) rather than relying on the card caller.
export function MapCard(props: MapCardProps) {
  return (
    <MapCardWithKey
      key={props.currentBreakdown + props.metricConfig.metricId}
      {...props}
    />
  );
}

function MapCardWithKey(props: MapCardProps) {
  const signalListeners: any = {
    click: (...args: any) => {
      const clickedData = args[1];
      props.updateFipsCallback(new Fips(clickedData.id));
    },
  };

  // TODO - make sure the legends are all the same
  const [breakdownFilter, setBreakdownFilter] = useState<string>("");
  const popover = usePopover();

  const datasetStore = useDatasetStore();

  let queries: Record<string, MetricQuery> = {};
  const possibleBreakdowns: BreakdownVar[] = [
    "race_and_ethnicity",
    "age",
    "sex",
  ];
  possibleBreakdowns.forEach((possibleBreakdown) => {
    if (
      props.currentBreakdown === possibleBreakdown ||
      props.currentBreakdown === "all"
    ) {
      queries[possibleBreakdown] = new MetricQuery(
        props.metricConfig.metricId,
        Breakdowns.byState().addBreakdown(
          possibleBreakdown,
          props.nonstandardizedRace
        )
      );
    }
  });

  return (
    <CardWrapper
      queries={Object.values(queries) as MetricQuery[]}
      title={
        <>{`${
          props.metricConfig.fullCardTitleName
        } in ${props.fips.getFullDisplayName()}`}</>
      }
      infoPopover={
        ["race_and_ethnicity", "all"].includes(props.currentBreakdown) ? (
          <RaceInfoPopoverContent />
        ) : undefined
      }
    >
      {() => {
        const currentlyDisplayedBreakdown: BreakdownVar =
          props.currentBreakdown === "all"
            ? "race_and_ethnicity"
            : props.currentBreakdown;
        const queryResponse = datasetStore.getMetrics(
          queries[currentlyDisplayedBreakdown]
        );
        const breakdownValues = queryResponse
          .getUniqueFieldValues(currentlyDisplayedBreakdown)
          .sort();
        if (breakdownFilter === "") {
          setBreakdownFilter(breakdownValues[0]);
        }

        let predicates: Array<(row: Row) => boolean> = [
          (row) => row.race_and_ethnicity !== "Not Hispanic or Latino",
          (row) => row[props.metricConfig.metricId] !== undefined,
          (row) => row[props.metricConfig.metricId] !== null,
        ];
        if (!props.fips.isUsa()) {
          // TODO - this doesn't consider county level data
          predicates.push((row: Row) => row.state_fips === props.fips.code);
        }
        if (props.enableFilter) {
          predicates.push(
            (row: Row) => row[currentlyDisplayedBreakdown] === breakdownFilter
          );
        }

        // Remove any row for which we find a filter that returns false.
        const mapData = queryResponse.data.filter((row: Row) =>
          predicates.every((predicate) => predicate(row))
        );

        return (
          <>
            <CardContent className={styles.SmallMarginContent}>
              <MapBreadcrumbs
                fips={props.fips}
                updateFipsCallback={props.updateFipsCallback}
              />
            </CardContent>

            {props.enableFilter && !queryResponse.dataIsMissing() && (
              <>
                <Divider />
                <CardContent
                  className={styles.SmallMarginContent}
                  style={{ textAlign: "left" }}
                >
                  <Grid container>
                    <Grid item style={{ lineHeight: "64px", fontSize: "20px" }}>
                      Filtered by:
                    </Grid>
                    <Grid item>
                      {/* TODO- Clean up UI */}
                      <List component="nav">
                        <ListItem button onClick={popover.open}>
                          <ListItemText primary={breakdownFilter} />
                          <ArrowDropDownIcon />
                        </ListItem>
                      </List>
                      {/* TODO - Align this with the mocks */}
                      <Menu
                        anchorEl={popover.anchor}
                        keepMounted
                        open={popover.isOpen}
                        onClose={popover.close}
                      >
                        {["age", "all"].includes(props.currentBreakdown) && (
                          <MenuItem disabled={true}>Age [unavailable]</MenuItem>
                        )}
                        {["sex", "all"].includes(props.currentBreakdown) && (
                          <MenuItem disabled={true}>Sex [unavailable]</MenuItem>
                        )}
                        {["race_and_ethnicity", "all"].includes(
                          props.currentBreakdown
                        ) && (
                          <>
                            <MenuItem disabled={true}>Races</MenuItem>
                            {breakdownValues.map((option) => (
                              <MenuItem
                                key={option}
                                onClick={(e) => {
                                  popover.close();
                                  setBreakdownFilter(option);
                                }}
                              >
                                {option}
                              </MenuItem>
                            ))}
                          </>
                        )}
                      </Menu>
                    </Grid>
                  </Grid>
                </CardContent>
              </>
            )}

            <Divider />
            {!props.fips.isUsa() /* TODO - don't hardcode */ && (
              <CardContent>
                <Alert severity="warning">
                  This dataset does not provide county level data
                </Alert>
              </CardContent>
            )}
            {queryResponse.dataIsMissing() && (
              <CardContent>
                <Alert severity="error">No data available</Alert>
              </CardContent>
            )}
            {!queryResponse.dataIsMissing() && (
              <CardContent>
                {props.metricConfig && (
                  <ChoroplethMap
                    signalListeners={signalListeners}
                    metric={props.metricConfig}
                    legendTitle={props.metricConfig.fullCardTitleName}
                    data={mapData}
                    hideLegend={!props.fips.isUsa()} // TODO - update logic here when we have county level data
                    showCounties={props.fips.isUsa() ? false : true}
                    fips={props.fips}
                  />
                )}
              </CardContent>
            )}
          </>
        );
      }}
    </CardWrapper>
  );
}
