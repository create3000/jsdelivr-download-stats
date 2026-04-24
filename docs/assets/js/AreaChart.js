import Chart from "./Chart.js";
import X3D   from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";
import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

import { WIDTH, HEIGHT } from "./Config.js";

class AreaChart extends Chart
{
   constructor (username, repository)
   {
      super ($("#area-chart"), username, repository);
   }

   async setup ()
   {
      super .setup ();

      $("#smoothing-range") .on ("change", () => this .build (this .entries));
   }

   async build (entries)
   {
      // Add labels.

      if (!super .build (entries))
         return;

      // Determine layout values.

      const
         length = entries .length,
         width  = WIDTH / length;

      // Add columns.

      const range = parseInt ($("#smoothing-range") .val ());

      this .geometry .index .length = 0;
      this .color .color .length    = 0;
      this .coord .point .length    = 0;

      // Create indices for four triangles.
      const
         indices = [0, 4, 1, 0, 3, 4,  1, 5, 2, 1, 4, 5],
         months  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      let xLabel = "";

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumAccumulatedHits = 0;

         if (i > 0)
         {
            const t = (i - 1) * 3;

            this .geometry .index .push (... indices .map (i => i + t));

            this .color .color .push (
               this .githubColor, this .githubColor,
               this .npmColor, this .npmColor,
            );
         }

         this .coord .point .push (new X3D .SFVec3f (i * width, sumAccumulatedHits, 0));

         for (const [host, hits] of Object .entries (hosts))
         {
            const
               startEntry = i - Math .floor (range / 2),
               endEntry   = startEntry + range;

            let
               accumulatedHits = 0,
               numEntries      = 0;

            for (let e = startEntry; e < endEntry; ++ e)
            {
               const entry = entries [e];

               if (!entry)
                  continue;

               accumulatedHits += entry [1] [host];

               ++ numEntries;
            }

            // console .log (startEntry, endEntry, numEntries, accumulatedHits)

            const y = $(`#show-${host}`) .is (":checked")
               ? sumAccumulatedHits += accumulatedHits / numEntries
               : sumAccumulatedHits;

            this .coord .point .push (new X3D .SFVec3f (i * width, y, 0));
         }

         const label = months [new Date (date) .getMonth ()];

         if (xLabel !== label)
         {
            xLabel = label;

            const transform = this .createLabel ("x", i * width, -0.005, label);

            this .xLabels .children .push (transform);
         }
      }
   }
}

export default AreaChart;
