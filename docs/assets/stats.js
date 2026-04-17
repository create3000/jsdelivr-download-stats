import X3D from "https://cdn.jsdelivr.net/npm/x_ite@14.1.3/dist/x_ite.min.mjs";

const gh  = await stats ("https://data.jsdelivr.com/v1/stats/packages/gh/create3000/x_ite?period=quarter");
const npm = await stats ("https://data.jsdelivr.com/v1/stats/packages/npm/x_ite?period=quarter");

for (const [date, hits] of Object .entries (gh .hits .dates))
{
  console .log (date, hits);
}

for (const [date, hits] of Object .entries (npm .hits .dates))
{
  console .log (date, hits);
}

async function stats (url)
{
  const response = await fetch (url, {
    method: 'GET',
    headers: {
      "accept": "application/json",
    },
  });

  return await response .json ();
}
