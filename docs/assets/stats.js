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
      // Query

      const url = new URL (location);

      this .username   = url .searchParams .get ("username");
      this .repository = url .searchParams .get ("repository");

      // Canvas

      this .canvas  = $(`<x3d-canvas splashScreen="false"></x3d-canvas>`);
      this .browser = this .canvas .get (0) .browser;

      this .browser .setBrowserOption ("AutoUpdate",    true);
      this .browser .setBrowserOption ("ContentScale",  -1);
      this .browser .setBrowserOption ("ContextMenu",   false);
      this .browser .setBrowserOption ("Notifications", false);
      this .browser .setBrowserOption ("Timings",       false);
      this .browser .setBrowserOption ("XRSessionMode", "NONE");

      const
         profile    = this .browser .getProfile ("Interchange"),
         components = [this .browser .getComponent ("Geometry2D")];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      $("#stats") .append (this .canvas);

      // Environment

      const
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint");

      navigationInfo .set_bind = true;
      navigationInfo .type     = ["NONE"];

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind    = true;
      viewpoint .position    = new X3D .SFVec3f (0.5, 0.2, 10);
      viewpoint .fieldOfView = new X3D .SFVec4f (-0.5, -0.2, 0.5, 0.2);

      this .scene .rootNodes .push (navigationInfo, background, viewpoint);

      // Rectangle

      const
         transform  = this .scene .createNode ("Transform"),
         shape      = this .scene .createNode ("Shape"),
         appearance = this .scene .createNode ("Appearance"),
         material   = this .scene .createNode ("UnlitMaterial"),
         geometry   = this .scene .createNode ("Rectangle2D");

      material .emissiveColor = new X3D .SFColor (0.9, 0.9, 0.9);
      geometry .solid         = true;
      geometry .size          = new X3D .SFVec2f (1, 1);

      appearance .material = material;
      shape .appearance    = appearance;
      shape .geometry      = geometry;

      transform .translation  = new X3D .SFVec3f (0.5, 0.2, 0);
      transform .scale        = new X3D .SFVec3f (1, 0.4, 1);

      transform .children .push (shape);

      this .scene .rootNodes .push (transform);

      // Stats

      // this .stats (this);
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
