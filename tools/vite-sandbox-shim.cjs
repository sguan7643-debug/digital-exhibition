const childProcess = require('node:child_process');
const { EventEmitter } = require('node:events');

const nativeExec = childProcess.exec;

childProcess.exec = function sandboxCompatibleExec(command, ...args) {
  if (command !== 'net use') return nativeExec.call(this, command, ...args);

  const callback = args.find(argument => typeof argument === 'function');
  const processHandle = new EventEmitter();
  processHandle.stdout = new EventEmitter();
  processHandle.stderr = new EventEmitter();
  processHandle.kill = () => true;

  process.nextTick(() => {
    callback?.(null, '', '');
    processHandle.emit('close', 0);
  });
  return processHandle;
};
