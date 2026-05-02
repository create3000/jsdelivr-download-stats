import Chart from "./Chart.js";
import X3D   from "https://cdn.jsdelivr.net/npm/x_ite@14.2.0/dist/x_ite.min.mjs";
import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

import { WIDTH, HEIGHT, GAP } from "./Config.js";

class ColumnChart extends Chart
{
   constructor (username, repository)
   {
      super ($("#column-chart"), username, repository);
   }

   async build (entries)
   {
      // Determine layout values.

      const
         length  = entries .length,
         gap     = $("#period") .val () === "year" ? 0 : GAP,
         width   = (WIDTH - gap * (length - 1)) / length;

      // Add labels.

      if (!await super .build (entries, width, gap))
         return;

      // Add columns.

      this .geometry .index .length = 0;
      this .color .color .length    = 0;
      this .coord .point .length    = 0;

      // Create indices for four triangles.
      const indices = [0, 1, 3, 0, 3, 2,  2, 3, 5, 2, 5, 4];

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumHits = 0;

         const t = i * 6;

         this .geometry .index .push (... indices .map (i => i + t));

         this .color .color .push (
            this .githubColor, this .githubColor,
            this .npmColor, this .npmColor,
         );

         this .coord .point .push (
            new X3D .SFVec3f (i * (width + gap),         sumHits, 0),
            new X3D .SFVec3f (i * (width + gap) + width, sumHits, 0),
         );

         for (const [host, hits] of Object .entries (hosts))
         {
            const y = $(`#show-${host}`) .is (":checked")
               ? sumHits += hits
               : sumHits;

            this .coord .point .push (
               new X3D .SFVec3f (i * (width + gap),         y, 0),
               new X3D .SFVec3f (i * (width + gap) + width, y, 0),
            );
         }
      }
   }
}

export default ColumnChart;
