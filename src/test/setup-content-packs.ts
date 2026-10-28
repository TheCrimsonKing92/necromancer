import { activateBonebinderPackRuntime } from "../game/content-packs/practice/bonebinder/pack";

// Unit tests exercise synchronous engine and persistence seams directly. The
// browser owns production admission; the test harness installs the same pack
// adapter before each isolated worker begins evaluating those seams.
activateBonebinderPackRuntime();
