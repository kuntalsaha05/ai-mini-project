import Map "mo:core/Map";
import Text "mo:core/Text";

actor {
  let projectDescription = "A minimal backend for an AI Mini Project web app. The app is mostly frontend-driven. The backend just needs to exist as a valid canister. No data persistence or APIs required -- all solver logic runs in the frontend.";
  let emptyData = Map.empty<Text, Text>();

  public shared ({ caller }) func doNothing() : async () {};
};
