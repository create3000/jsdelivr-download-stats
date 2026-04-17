import X3D from "https://cdn.jsdelivr.net/npm/x_ite@14.1.3/dist/x_ite.min.mjs";
import { $ } from "https://code.jquery.com/jquery-4.0.0.module.min.js";

class Stats
{
   static run ()
   {
      this .instance = new Stats ();
   }

   constructor ()
   {
      this .setup ();
   }

   async setup ()
   {
      const url = new URL (location);

      this .canvas = $(`<x3d-canvas splashScreen="false"></x3d-canvas>`);

      this .username   = url .searchParams .get ("username");
      this .repository = url .searchParams .get ("repository");

      this .stats (this);

      $("#stats") .append (this .canvas);
   }

   async stats ({ username, repository, period = "quarter" })
   {
      console .log ("Generate stats for:", username, repository, period);

      const gh = await this .download (`https://data.jsdelivr.com/v1/stats/packages/gh/${username}/${repository}?period=${period}`);

      for (const [date, hits] of Object .entries (gh .hits .dates))
      {
         console .log (date, hits);
      }

      const npm = await this .download (`https://data.jsdelivr.com/v1/stats/packages/npm/${repository}?period=${period}`);

      for (const [date, hits] of Object .entries (npm .hits .dates))
      {
         console .log (date, hits);
      }
   }

   async download (url)
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
