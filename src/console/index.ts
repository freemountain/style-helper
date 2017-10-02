export * from "./ICommand";
export * from "./ICommandEventStream";
export * from "./createMain";

import { FakeEventStream } from "./FakeEventStream";
import { ICommandEventStream } from "./ICommandEventStream";

export const fakeStream: () => ICommandEventStream  = () => new FakeEventStream();
