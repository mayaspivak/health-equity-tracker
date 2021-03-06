import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { METRIC_CONFIG } from "../../data/MetricConfig";
import { ChoroplethMap, ChoroplethMapProps } from "../ChoroplethMap";
import { Fips, USA_FIPS } from "../../utils/madlib/Fips";
import { StoryWrapper } from "../../storybook/StoryWrapper";

export default {
  title: "Charts/ChoroplethMap",
  decorators: [StoryWrapper],
  component: ChoroplethMap,
} as Meta;

const Template: Story<ChoroplethMapProps> = (args) => (
  <ChoroplethMap {...args} />
);

export const Example1 = Template.bind({});
Example1.args = {
  data: [
    { covid_cases_per_100k: 4909, state_fips: "04", state_name: "Arizona" },
    { covid_cases_per_100k: 3183, state_fips: "06", state_name: "California" },
    { covid_cases_per_100k: 4360, state_fips: "08", state_name: "Colorado" },
  ],
  metric: METRIC_CONFIG["covid"][0].metrics["per100k"],
  legendTitle: "Legend Title",
  signalListeners: [],
  fips: new Fips(USA_FIPS),
  showCounties: false,
};
