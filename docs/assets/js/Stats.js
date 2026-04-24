import ColumnChart from "./ColumnChart.js";
import AreaChart   from "./AreaChart.js";
import DataStorage from "./DataStorage.js";
import { $ }       from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

// window .X3D = X3D;

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
      // Query

      const url = new URL (location);

      this .username   = url .searchParams .get ("username");
      this .repository = url .searchParams .get ("repository");

      if (!this .username || !this .repository)
      {
         // Show username and repository inputs.

         $("main.inputs") .show ();

         $("main.inputs .submit") .on ("click", () =>
         {
            const
               username   = $("#username") .val (),
               repository = $("#repository") .val ();

            url .searchParams .set ("username",   username);
            url .searchParams .set ("repository", repository);

            window .location = url;
         });

         return;
      }

      // Configuration

      this .config = new DataStorage (localStorage, "jsDeliverStats.");

      this .config .setDefaultValues ({
         period: "quarter",
         showGitHub: true,
         showNpm: true,
         monthSmoothyRange: 3,
         quarterSmoothyRange: 7,
         yearSmoothyRange: 30,
      });

      $("#period")
         .val (this .config .period)
         .on ("change", () => this .config .period = $("#period") .val ());

      $("#show-github")
         .prop ("checked", this .config .showGitHub)
         .on ("change", () => this .config .showGitHub = $("#show-github") .is (":checked"));

      $("#show-npm")
         .prop ("checked", this .config .showNpm)
         .on ("change", () => this .config .showNpm = $("#show-npm") .is (":checked"));

      $("#smoothing-range")
         .on ("change", () => this .config [`${$("#period") .val ()}SmoothyRange`] = parseInt ($("#smoothing-range") .val ()));

      // Charts

      $("main.stats") .show ();
      $("title") .text (`${this .username}/${this .repository} - ${$("title") .text ()}`);

      $("#refresh") .on ("click", () => this .build ());
      $("#period") .on ("change", () => this .build ());

      this .columnChart = new ColumnChart (this .username, this .repository);
      this .areaChart   = new AreaChart (this .username, this .repository);

      await Promise .all ([
         this .columnChart .setup (),
         this .areaChart .setup (),
      ]);

      this .build ();
   }

   async build ()
   {
      $("#refresh") .addClass ("active");
      $("#period-title") .text ($("#period") .val () .toUpperCaseFirst ());
      $("#smoothing-range") .val (this .config [`${$("#period") .val ()}SmoothyRange`]);

      // Download and combine entries.
      const entries = await this .downloadEntries ($("#period") .val ());

      await Promise .all ([
         this .columnChart .build (entries),
         this .areaChart .build (entries),
      ]);

      $("#refresh") .removeClass ("active");
   }

   async downloadEntries (period = "quarter")
   {
      const { username, repository } = this;

      const github  = await this .download (`https://data.jsdelivr.com/v1/stats/packages/gh/${username}/${repository}?period=${period}`);
      const npm     = await this .download (`https://data.jsdelivr.com/v1/stats/packages/npm/${repository}?period=${period}`);
      const entries = Object .entries (github .hits .dates) .map (([date, hits]) => [date, { github: hits, npm: npm .hits .dates [date] }]);

      return entries;
   }

   async download (url)
   {
      const response = await fetch (url);

      return await response .json ();
   }
}

export default Stats;
