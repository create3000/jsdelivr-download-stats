import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

class Hits
{
   async setup ()
   {
      // Stats

      $("#hosts input") .on ("change", () => this .build (this .entries));
   }

   async build (entries)
   {
      if (!entries)
         return;

      this .entries = entries;

      // Determine sum.

      let sumHits = 0;

      for (const [date, hosts] of entries)
      {
         for (const [host, hits] of Object .entries (hosts))
         {
            if (!$(`#show-${host}`) .is (":checked"))
               continue;

            sumHits += hits;
         }
      }

      $("#hits") .text (sumHits .toLocaleString ("en"));
   }
}

export default Hits;
