import { ElementGenerator } from '../components/element-generator';
import { HeaderGenerator } from '../components/header-generator';
import { FooterGenerator } from '../components/footer-generator';
import { ConnectorGenerator } from '../components/connector-generator';
import { FlowElement } from '../../../types/flow-dsl';
import { ElementStrategy } from '../strategies/element-strategy';
import { AssignmentStrategy } from '../strategies/assignment-strategy';
import { DecisionStrategy } from '../strategies/decision-strategy';
import { ScreenStrategy } from '../strategies/screen-strategy';
import { RecordCreateStrategy } from '../strategies/record-create-strategy';
import { RecordUpdateStrategy } from '../strategies/record-update-strategy';
import { SubflowStrategy } from '../strategies/subflow-strategy';
import { LoopStrategy } from '../strategies/loop-strategy';
import { WaitStrategy } from '../strategies/wait-strategy';
import { GetRecordsStrategy } from '../strategies/get-records-strategy';
import { FaultStrategy } from '../strategies/fault-strategy';

export class GeneratorFactory {
  createHeaderGenerator(): HeaderGenerator {
    return new HeaderGenerator();
  }

  createFooterGenerator(): FooterGenerator {
    return new FooterGenerator();
  }

  createConnectorGenerator(): ConnectorGenerator {
    return new ConnectorGenerator();
  }

  createElementGenerator(): ElementGenerator {
    return new ElementGenerator(this.createStrategies());
  }

  createStrategies(): Map<FlowElement['type'], ElementStrategy> {
    return new Map<FlowElement['type'], ElementStrategy>([
      ['Assignment', new AssignmentStrategy()],
      ['Decision', new DecisionStrategy()],
      ['Screen', new ScreenStrategy()],
      ['RecordCreate', new RecordCreateStrategy()],
      ['RecordUpdate', new RecordUpdateStrategy()],
      ['Subflow', new SubflowStrategy()],
      ['Loop', new LoopStrategy()],
      ['Wait', new WaitStrategy()],
      ['GetRecords', new GetRecordsStrategy()],
      ['Fault', new FaultStrategy()],
    ]);
  }
}
