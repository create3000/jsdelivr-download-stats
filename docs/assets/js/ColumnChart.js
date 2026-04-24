import Chart from "./Chart.js";
import X3D   from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";
import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

// window .X3D = X3D;

const
   WIDTH  = 1,
   HEIGHT = 0.3;

class ColumnChart extends Chart
{
   constructor (username, repository)
   {
      super ($("#column-chart"), username, repository);
   }

   async build (entries)
   {
      // Add labels.

      if (!super .build (entries))
         return;

      // Determine layout values.

      const
         gap     = $("#period") .val () === "year" ? 0 : 0.002,
         length  = entries .length,
         width   = (WIDTH - gap * (length - 1)) / length;

      // Add columns.

      this .geometry .index .length = 0;
      this .color .color .length    = 0;
      this .coord .point .length    = 0;

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumHits = 0;

         const t = i * 6;

         this .geometry .index .push (t, t + 1, t + 3, t, t + 3, t + 2,  t + 2, t + 3, t + 5, t + 2, t + 5, t + 4);

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
