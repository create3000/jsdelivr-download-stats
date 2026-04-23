import Stats from "./js/Stats.js";

Object .defineProperty (String .prototype, "toUpperCaseFirst",
{
   value ()
   {
      return this .charAt (0) .toUpperCase () + this .slice (1);
   },
   enumerable: false
});

Stats .run ();
