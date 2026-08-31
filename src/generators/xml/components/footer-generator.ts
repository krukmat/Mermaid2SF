import { FlowDSL, DEFAULT_FLOW_STATUS } from '../../../types/flow-dsl';

export class FooterGenerator {
  generate(dsl: FlowDSL): string[] {
    return [`    <status>${dsl.status || DEFAULT_FLOW_STATUS}</status>`, '</Flow>'];
  }
}
