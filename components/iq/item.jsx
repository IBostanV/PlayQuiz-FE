import React from 'react';
import {useTranslation} from 'react-i18next';
import {Figure} from './figure';

// The four kinds of question, drawn from the payload the server sends. What they have in common:
// something to work out, and a row of options to pick from. Nothing here knows which one is right.

const Option = ({index, picked, disabled, onPick, children}) => (
    <button type='button'
            className='iq-option'
            data-picked={index === picked}
            disabled={disabled}
            onClick={() => onPick(index)}>
        {children}
    </button>
);

// The 3x3 grid with its last cell missing: rules run along the rows and down the columns, and the
// missing cell is where they meet.
const Matrix = ({payload, ...rest}) => {
    const {t} = useTranslation();

    return (
        <>
            <div className='iq-matrix' role='img' aria-label={t('iq_matrix_alt', 'A grid of figures with one missing')}>
                {payload.c.map((cell, index) => <span key={index} className='iq-cell'><Figure spec={cell}/></span>)}
                <span className='iq-cell' data-missing>?</span>
            </div>
            <Options options={payload.o} {...rest}/>
        </>
    );
};

// A is to B as C is to what: the change from A to B, read off and applied again.
const Analogy = ({payload, ...rest}) => (
    <>
        <div className='iq-analogy'>
            <span className='iq-cell'><Figure spec={payload.a}/></span>
            <span className='iq-analogy-mark' aria-hidden>&rarr;</span>
            <span className='iq-cell'><Figure spec={payload.b}/></span>
            <span className='iq-analogy-mark' aria-hidden>:</span>
            <span className='iq-cell'><Figure spec={payload.c}/></span>
            <span className='iq-analogy-mark' aria-hidden>&rarr;</span>
            <span className='iq-cell' data-missing>?</span>
        </div>
        <Options options={payload.o} {...rest}/>
    </>
);

// Four figures keep a rule and one breaks it. The figures are the options here.
const Odd = ({payload, ...rest}) => <Options options={payload.g} {...rest}/>;

// The numbers carry the rule; the options are the number that comes next.
const Series = ({payload, picked, disabled, onPick}) => (
    <>
        <div className='iq-series'>
            {payload.t.map((term, index) => <span key={index} className='iq-term'>{term}</span>)}
            <span className='iq-term' data-missing>?</span>
        </div>
        <div className='iq-options' data-numeric>
            {payload.o.map((option, index) => (
                <Option key={index} index={index} picked={picked} disabled={disabled} onPick={onPick}>
                    <span className='iq-option-number'>{option}</span>
                </Option>
            ))}
        </div>
    </>
);

const Options = ({options, picked, disabled, onPick}) => (
    <div className='iq-options'>
        {options.map((option, index) => (
            <Option key={index} index={index} picked={picked} disabled={disabled} onPick={onPick}>
                <Figure spec={option}/>
            </Option>
        ))}
    </div>
);

const BY_TYPE = {MATRIX: Matrix, ANALOGY: Analogy, ODD: Odd, SERIES: Series};

const PROMPTS = {
    MATRIX: ['iq_prompt_matrix', 'Which figure completes the grid?'],
    ANALOGY: ['iq_prompt_analogy', 'The first figure changes into the second. Change the third the same way.'],
    ODD: ['iq_prompt_odd', 'Four of these belong together. Which one does not?'],
    SERIES: ['iq_prompt_series', 'Which number comes next?'],
};

export const IqItem = ({question, picked, disabled, onPick}) => {
    const {t} = useTranslation();
    const Body = BY_TYPE[question.type];
    if (!Body) return null;

    return (
        <div className='iq-item'>
            <p className='iq-prompt'>{t(...PROMPTS[question.type])}</p>
            <Body payload={question.payload} picked={picked} disabled={disabled} onPick={onPick}/>
        </div>
    );
};
