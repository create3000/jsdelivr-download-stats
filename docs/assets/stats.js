import X3D from "https://cdn.jsdelivr.net/npm/x_ite@14.1.3/dist/x_ite.min.mjs";

class Stats
{
   static run ()
   {
      this .instance = new Stats ();
   }

   constructor ()
   {
      const url = new URL (location);

      this .username   = url .searchParams .get ("username");
      this .repository = url .searchParams .get ("repository");

      console .log (this .username, this .repository)
   }

   async download (username, repository, period = "quarter")
   {
      const gh  = await stats (`https://data.jsdelivr.com/v1/stats/packages/gh/${username}/${repository}?period=${period}`);
      const npm = await stats (`https://data.jsdelivr.com/v1/stats/packages/npm/${repository}?period=${period}`);

      for (const [date, hits] of Object .entries (gh .hits .dates))
      {
         console .log (date, hits);
      }

      for (const [date, hits] of Object .entries (npm .hits .dates))
      {
         console .log (date, hits);
      }
   }

   async stats (url)
   {
      const response = await fetch (url, {
         method: 'GET',
         headers: {
            "accept": "application/json",
         },
      });

      return await response .json ();
   }
}

Stats .run ();
