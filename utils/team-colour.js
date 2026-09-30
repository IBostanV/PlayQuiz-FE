// A Conquest team's colour, from its group id: the golden angle spreads consecutive ids round the
// wheel, so two teams side by side on the map never come out as near shades of one hue. The same
// id gives the same colour on the map, in the legend and in the standings.
export const teamHue = (teamId) => Math.round((Number(teamId) * 137.508) % 360);

export const teamFill = (teamId) => `hsl(${teamHue(teamId)} 60% 42%)`;
